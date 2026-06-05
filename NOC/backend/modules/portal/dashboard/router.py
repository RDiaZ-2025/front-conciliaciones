from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case, text
from typing import Optional, List, Dict, Any
import database, dependencies
from modules.portal.dashboard import models

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    responses={404: {"description": "Not found"}},
)

def apply_filters(q, start_date=None, end_date=None, source=None, section=None, author=None, topic=None, category=None):
    if start_date:
        q = q.filter(models.DashboardData.fecha_url >= start_date)
    if end_date:
        q = q.filter(models.DashboardData.fecha_url <= end_date)
    
    def add_filter(query, field, value):
        if value:
            if isinstance(value, list):
                return query.filter(field.in_(value))
            return query.filter(field == value)
        return query

    q = add_filter(q, models.DashboardData.fuente, source)
    q = add_filter(q, models.DashboardData.seccion, section)
    q = add_filter(q, models.DashboardData.autor, author)
    q = add_filter(q, models.DashboardData.tema_principal, topic)
    q = add_filter(q, models.DashboardData.categoria_entidad, category)
    
    return q

# Tab 1: Overview "¿Cómo vamos?"
@router.get("/overview")
def get_overview_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    source: Optional[List[str]] = Query(None),
    section: Optional[List[str]] = Query(None),
    author: Optional[List[str]] = Query(None),
    topic: Optional[List[str]] = Query(None),
    category: Optional[List[str]] = Query(None),
    db: Session = Depends(dependencies.get_db),
    user = Depends(dependencies.check_permission("dashboard"))
):
    from datetime import datetime, timedelta

    # Manejo de fechas para comparaciones
    fmt = '%Y-%m-%d'
    
    # valores por defecto si no se proporciona
    if not start_date:
        # Ultimos 30 dias por defecto
        today = datetime.today()
        start_date_dt = today - timedelta(days=30)
        end_date_dt = today
        start_date = start_date_dt.strftime(fmt)
        end_date = end_date_dt.strftime(fmt)
    else:
        start_date_dt = datetime.strptime(start_date, fmt)
        end_date_dt = datetime.strptime(end_date, fmt)

    # Calcular periodo anterior
    duration_days = (end_date_dt - start_date_dt).days + 1
    prev_end_date_dt = start_date_dt - timedelta(days=1)
    prev_start_date_dt = prev_end_date_dt - timedelta(days=duration_days - 1)
    
    prev_start_date = prev_start_date_dt.strftime(fmt)
    prev_end_date = prev_end_date_dt.strftime(fmt)

    # Obtener estadisticas
    def get_stats(s_date, e_date):
        base_query = db.query(models.DashboardData)
        q = apply_filters(base_query, s_date, e_date, source, section, author, topic, category)
        
        # Agrupar 5 consultas SQL en 1 sola para evitar latencia de red en Azure SQL
        row = q.with_entities(
            func.sum(models.DashboardData.total_users),
            func.sum(models.DashboardData.screen_page_views),
            func.sum(models.DashboardData.sessions),
            func.sum(models.DashboardData.engaged_sessions),
            func.count(models.DashboardData.id)
        ).first()
        
        if not row:
            return {"users": 0, "views": 0, "sessions": 0, "engaged": 0, "articles": 0}
            
        return {
            "users": row[0] or 0,
            "views": row[1] or 0,
            "sessions": row[2] or 0,
            "engaged": row[3] or 0,
            "articles": row[4] or 0
        }

    curr = get_stats(start_date, end_date)
    prev = get_stats(prev_start_date, prev_end_date)

    # Calculos y variaciones
    def calc_var(curr_val, prev_val):
        if prev_val == 0: return 100 if curr_val > 0 else 0
        return ((curr_val - prev_val) / prev_val) * 100

    # KPIs
    engagement_rate = (curr["engaged"] / curr["sessions"] * 100) if curr["sessions"] > 0 else 0
    prev_engagement_rate = (prev["engaged"] / prev["sessions"] * 100) if prev["sessions"] > 0 else 0
    
    pages_per_session = (curr["views"] / curr["sessions"]) if curr["sessions"] > 0 else 0
    prev_pps = (prev["views"] / prev["sessions"]) if prev["sessions"] > 0 else 0
    
    fidelity = (curr["sessions"] / curr["users"]) if curr["users"] > 0 else 0
    prev_fidelity = (prev["sessions"] / prev["users"]) if prev["users"] > 0 else 0

    cards = {
        "total_users": curr["users"],
        "users_variation": round(calc_var(curr["users"], prev["users"]), 1),
        
        "total_views": curr["views"],
        "views_variation": round(calc_var(curr["views"], prev["views"]), 1),
        
        "engagement_rate": round(engagement_rate, 2),
        "engagement_rate_variation": round(engagement_rate - prev_engagement_rate, 2), # Absolute diff for percentage points
        
        "pages_per_session": round(pages_per_session, 2),
        "pps_variation": round(calc_var(pages_per_session, prev_pps), 1),
        
        "fidelity": round(fidelity, 2),
        "fidelity_variation": round(calc_var(fidelity, prev_fidelity), 1),
        
        "active_source": source or "Todas"
    }

    # Seccion de volumen
    volume = {
        "total_articles": curr["articles"],
        "variation": round(calc_var(curr["articles"], prev["articles"]), 1),
        "history": [] 
    }

    # Historico para el grafico de volumen (Articles vs Views over time)
    # Agrupar por Día si la duración <= 60 días, de lo contrario por Mes
    is_sqlite = db.bind.dialect.name == 'sqlite'
    if is_sqlite:
        group_func = func.strftime('%Y-%m-%d', models.DashboardData.fecha_url) if duration_days <= 60 else func.strftime('%Y-%m', models.DashboardData.fecha_url)
    else:
        group_func = func.to_char(models.DashboardData.fecha_url, 'YYYY-MM-DD') if duration_days <= 60 else func.to_char(models.DashboardData.fecha_url, 'YYYY-MM')
    
    vol_hist_query = apply_filters(db.query(
        group_func.label('date_key'),
        func.count(models.DashboardData.id).label('articles'),
        func.sum(models.DashboardData.screen_page_views).label('views')
    ), start_date, end_date, source, section, author, topic, category).group_by('date_key').order_by('date_key')

    volume["history"] = [
        {"date": h.date_key, "articles": h.articles, "views": h.views} 
        for h in vol_hist_query.all()
    ]

    # Tendencias (Sessions y Engagement)
    trend_query = apply_filters(db.query(
        group_func.label('date_key'),
        func.sum(models.DashboardData.sessions).label('sessions'),
        func.sum(models.DashboardData.engaged_sessions).label('engaged_sessions')
    ), start_date, end_date, source, section, author, topic, category).group_by('date_key').order_by('date_key')
    
    trend_formatted = []
    for t in trend_query.all():
        sess = t.sessions or 0
        eng = t.engaged_sessions or 0
        er = (eng / sess * 100) if sess > 0 else 0
        trend_formatted.append({
            "period": t.date_key,
            "sessions": sess,
            "engagement_rate": round(er, 2)
        })

    # Destacados
    # Sección principal (por Tasa de Interacción con sesiones mínimas)
    min_sessions = 50 # Umbral más bajo para periodos más cortos
    top_section_query = apply_filters(db.query(
        models.DashboardData.seccion,
        func.sum(models.DashboardData.sessions).label('sess'),
        func.sum(models.DashboardData.engaged_sessions).label('eng')
    ), start_date, end_date, source, section, author, topic, category).group_by(models.DashboardData.seccion).having(func.sum(models.DashboardData.sessions) > min_sessions)
    
    sections = top_section_query.all()
    top_section = max(sections, key=lambda x: (x.eng / x.sess) if x.sess > 0 else 0) if sections else None

    # Tema Viral (por Engagement Rate)
    top_topic_query = apply_filters(db.query(
        models.DashboardData.tema_principal,
        func.sum(models.DashboardData.sessions).label('sess'),
        func.sum(models.DashboardData.engaged_sessions).label('eng')
    ), start_date, end_date, source, section, author, topic, category).group_by(models.DashboardData.tema_principal).having(func.sum(models.DashboardData.sessions) > min_sessions)
    
    topics = top_topic_query.all()
    viral_topic = max(topics, key=lambda x: (x.eng / x.sess) if x.sess > 0 else 0) if topics else None

    # Autor destacado
    top_author_query = apply_filters(db.query(
        models.DashboardData.autor,
        func.sum(models.DashboardData.sessions).label('sess'),
        func.sum(models.DashboardData.engaged_sessions).label('eng')
    ), start_date, end_date, source, section, author, topic, category).group_by(models.DashboardData.autor).having(func.sum(models.DashboardData.sessions) > min_sessions)
    
    authors = top_author_query.all()
    featured_author = max(authors, key=lambda x: (x.eng / x.sess) if x.sess > 0 else 0) if authors else None

    return {
        "cards": cards,
        "volume": volume,
        "trend": trend_formatted,
        "highlights": {
            "top_section": top_section.seccion if top_section else "N/A",
            "viral_topic": viral_topic.tema_principal if viral_topic else "N/A",
            "featured_author": featured_author.autor if featured_author else "N/A"
        },
        "comparison_period": f"vs {prev_start_date_dt.strftime('%d %b')} - {prev_end_date_dt.strftime('%d %b')}"
    }

# Tab 2: Content ("¿Qué temas y autores potenciar?")
@router.get("/content")
def get_content_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    source: Optional[List[str]] = Query(None),
    section: Optional[List[str]] = Query(None),
    author: Optional[List[str]] = Query(None),
    topic: Optional[List[str]] = Query(None),
    category: Optional[List[str]] = Query(None),
    db: Session = Depends(dependencies.get_db),
    user = Depends(dependencies.check_permission("dashboard"))
):
    # Matriz: Temas (Sessions vs Engagement Rate) (Sesiones vs. Tasa de Interacción)
    topic_query = apply_filters(db.query(
        models.DashboardData.tema_principal,
        func.sum(models.DashboardData.sessions).label('sessions'),
        func.sum(models.DashboardData.engaged_sessions).label('engaged_sessions')
    ), start_date, end_date, source, section, author, topic, category).group_by(models.DashboardData.tema_principal)
    
    topics_data = []
    for t in topic_query.all():
        if t.tema_principal:
            sess = t.sessions or 0
            eng_sess = t.engaged_sessions or 0
            er = (eng_sess / sess * 100) if sess > 0 else 0
            topics_data.append({
                "topic": t.tema_principal,
                "sessions": sess,
                "engagement_rate": round(er, 2)
            })

    # Author Ranking
    # Score = (Calidad + Impacto + Productividad) / 3
    # Calidad = Engagement Rate
    # Impacto = Volumen Relativo (Sesiones)
    # Productividad = Volumen de Producción Relativo (Artículos)
    author_query = apply_filters(db.query(
        models.DashboardData.autor,
        func.sum(models.DashboardData.sessions).label('sessions'),
        func.sum(models.DashboardData.engaged_sessions).label('engaged_sessions'),
        func.count(models.DashboardData.id).label('articles')
    ), start_date, end_date, source, section, author, topic, category).group_by(models.DashboardData.autor)
    
    authors_raw = author_query.all()
    max_sessions = max([a.sessions for a in authors_raw]) if authors_raw else 1
    max_articles = max([a.articles for a in authors_raw]) if authors_raw else 1
    
    authors_ranking = []
    for a in authors_raw:
        if not a.autor: continue
        sess = a.sessions or 0
        eng_sess = a.engaged_sessions or 0
        arts = a.articles or 0
        
        er = (eng_sess / sess * 100) if sess > 0 else 0
        rel_vol = (sess / max_sessions * 100) if max_sessions > 0 else 0
        rel_prod = (arts / max_articles * 100) if max_articles > 0 else 0
        
        # Puntaje de equilibrio (33.3% de peso para cada factor)
        score = (er + rel_vol + rel_prod) / 3
        
        authors_ranking.append({
            "author": a.autor,
            "score": round(score, 1),
            "sessions": sess,
            "articles": arts,
            "engagement_rate": round(er, 1)
        })
    
    authors_ranking.sort(key=lambda x: x['score'], reverse=True)

    return {
        "matrix": topics_data,
        "authors": authors_ranking
    }

# Tab 3: Entities ("¿Sobre quién escribir?")
@router.get("/entities")
def get_entities_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    source: Optional[List[str]] = Query(None),
    section: Optional[List[str]] = Query(None),
    topic: Optional[List[str]] = Query(None),
    author: Optional[List[str]] = Query(None),
    category: Optional[List[str]] = Query(None),
    db: Session = Depends(dependencies.get_db),
    user = Depends(dependencies.check_permission("dashboard"))
):
    from datetime import datetime, timedelta

    # 1. Tasa de interacción promedio global para la muestra filtrada
    total_q = apply_filters(db.query(
        func.sum(models.DashboardData.sessions).label('s'),
        func.sum(models.DashboardData.engaged_sessions).label('es')
    ), start_date, end_date, source, section, author, topic, category).first()
    section_avg_er = (total_q.es / total_q.s * 100) if total_q and total_q.s and total_q.s > 0 else 0

    # 2. Agregue estadísticas de entidades usando JOIN con la tabla de entidades
    entity_rows = apply_filters(
        db.query(
            models.Entity.name.label('entity_name'),
            models.Entity.semantic_score.label('sem'),
            models.Entity.syntactic_score.label('syn'),
            models.DashboardData.sessions,
            models.DashboardData.engaged_sessions,
            models.DashboardData.fecha_url,
        ).join(models.Entity, models.DashboardData.id == models.Entity.dashboard_data_id),
        start_date, end_date, source, section, author, topic, category
    ).all()

    if not entity_rows:
        return {"section_avg": 0, "entities": [], "best_combinations": [], "conclusions": []}

    ref_date = end_date if end_date else datetime.now().strftime('%Y-%m-%d')
    history_start = (datetime.strptime(ref_date, '%Y-%m-%d') - timedelta(days=7)).strftime('%Y-%m-%d')

    entity_stats: Dict[str, Any] = {}
    history_map: Dict[str, Dict] = {}

    for row in entity_rows:
        e = row.entity_name
        if not e:
            continue
        sess = row.sessions or 0
        eng = row.engaged_sessions or 0
        sem = row.sem or 0.0
        syn = row.syn or 0.0
        date_str = row.fecha_url.strftime('%Y-%m-%d') if row.fecha_url else None

        if e not in entity_stats:
            entity_stats[e] = {"s": 0, "es": 0, "sem_sum": 0, "syn_sum": 0, "count": 0}
        entity_stats[e]["s"] += sess
        entity_stats[e]["es"] += eng
        entity_stats[e]["sem_sum"] += sem
        entity_stats[e]["syn_sum"] += syn
        entity_stats[e]["count"] += 1

        if date_str and history_start <= date_str <= ref_date:
            if e not in history_map:
                history_map[e] = {}
            if date_str not in history_map[e]:
                history_map[e][date_str] = {"s": 0, "es": 0}
            history_map[e][date_str]["s"] += sess
            history_map[e][date_str]["es"] += eng

    # 3. Construir combinaciones a partir de pares de entidad principal + secundaria por artículo
    # Obtener IDs de artículos distintos con sus entidades para construir combinaciones de manera eficiente
    combo_rows = apply_filters(
        db.query(
            models.DashboardData.id.label('art_id'),
            models.Entity.name.label('ent_name'),
            models.Entity.is_principal.label('is_principal'),
        ).join(models.Entity, models.DashboardData.id == models.Entity.dashboard_data_id),
        start_date, end_date, source, section, author, topic, category
    ).all()

    articles_entities: Dict[int, Dict] = {}
    for cr in combo_rows:
        aid = cr.art_id
        if aid not in articles_entities:
            articles_entities[aid] = {"principal": None, "secondaries": []}
        if cr.is_principal:
            articles_entities[aid]["principal"] = cr.ent_name
        else:
            articles_entities[aid]["secondaries"].append(cr.ent_name)

    combinations: Dict[str, int] = {}
    for art_data in articles_entities.values():
        main = art_data["principal"]
        if main:
            for sec in art_data["secondaries"]:
                combo = f"{main} + {sec}"
                combinations[combo] = combinations.get(combo, 0) + 1

    # 4. Construir lista de resultados
    entities_data = []
    for e, stats in entity_stats.items():
        sess = stats["s"]
        eng_sess = stats["es"]
        er = (eng_sess / sess * 100) if sess > 0 else 0
        avg_sem = stats["sem_sum"] / stats["count"] if stats["count"] > 0 else 0
        avg_syn = stats["syn_sum"] / stats["count"] if stats["count"] > 0 else 0

        trend = []
        for i in range(8):
            d = (datetime.strptime(ref_date, '%Y-%m-%d') - timedelta(days=7 - i)).strftime('%Y-%m-%d')
            day_data = history_map.get(e, {}).get(d, {"s": 0, "es": 0})
            if isinstance(day_data, dict):
                day_er = round((day_data["es"] / day_data["s"] * 100) if day_data["s"] > 0 else 0, 1)
            else:
                day_er = day_data
            trend.append(day_er)

        entities_data.append({
            "entity": e,
            "semantic_score": round(avg_sem, 2),
            "syntactic_score": round(avg_syn, 2),
            "engagement_score": round(er, 1),
            "dev_vs_avg": round(er - section_avg_er, 1),
            "sessions": sess,
            "sparkline": trend,
        })

    entities_data.sort(key=lambda x: x['engagement_score'], reverse=True)
    total_count = len(entities_data)
    for i, ent in enumerate(entities_data):
        ent["percentile"] = round(100 - (i / total_count * 100)) if total_count > 0 else 0

    best_combinations = sorted(combinations.items(), key=lambda x: x[1], reverse=True)[:5]

    conclusions = []
    if entities_data:
        top_ent = entities_data[0]
        conclusions.append(f"La entidad '{top_ent['entity']}' lidera el engagement con {top_ent['engagement_score']}%")
    avg_semantic = sum(e['semantic_score'] for e in entities_data) / len(entities_data) if entities_data else 0
    if avg_semantic > 0.7:
        conclusions.append("Existe una alta relevancia semántica en los temas actuales, lo que indica coherencia editorial.")

    return {
        "section_avg": round(section_avg_er, 1),
        "entities": entities_data,
        "best_combinations": [{"pair": c[0], "count": c[1]} for c in best_combinations],
        "conclusions": conclusions,
    }

@router.get("/entities/detail")
def get_entity_detail(
    entity: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    source: Optional[List[str]] = Query(None),
    section: Optional[List[str]] = Query(None),
    author: Optional[List[str]] = Query(None),
    topic: Optional[List[str]] = Query(None),
    category: Optional[List[str]] = Query(None),
    db: Session = Depends(dependencies.get_db),
    user = Depends(dependencies.check_permission("dashboard"))
):
    # Encuentra todos los artículos que mencionan esta entidad (como principal o secundaria)
    article_ids_q = apply_filters(
        db.query(models.DashboardData.id).join(
            models.Entity, models.DashboardData.id == models.Entity.dashboard_data_id
        ).filter(models.Entity.name == entity),
        start_date, end_date, source, section, author, topic, category
    ).distinct()

    article_ids = [row.id for row in article_ids_q.all()]
    if not article_ids:
        raise HTTPException(status_code=404, detail="Entity not found")

    articles = db.query(models.DashboardData).filter(models.DashboardData.id.in_(article_ids)).all()

    total_sess = sum(a.sessions or 0 for a in articles)
    total_eng = sum(a.engaged_sessions or 0 for a in articles)
    avg_er = (total_eng / total_sess * 100) if total_sess > 0 else 0

    # Puntuaciones y tipo de entidad de la tabla de entidades
    entity_records = (
        db.query(models.Entity)
        .filter(
            models.Entity.name == entity,
            models.Entity.dashboard_data_id.in_(article_ids)
        )
        .all()
    )

    sem_vals = [e.semantic_score for e in entity_records if e.semantic_score is not None]
    syn_vals = [e.syntactic_score for e in entity_records if e.syntactic_score is not None]
    avg_sem = sum(sem_vals) / len(sem_vals) if sem_vals else 0.0
    avg_syn = sum(syn_vals) / len(syn_vals) if syn_vals else 0.0

    # Determinar el tipo de entidad (usar el primer registro principal que tenga tipo, de lo contrario el primer resultado)
    main_entity_type = "Tema"
    for er_rec in entity_records:
        if er_rec.is_principal and er_rec.type:
            main_entity_type = er_rec.type
            break
    if main_entity_type == "Tema" and entity_records and entity_records[0].type:
        main_entity_type = entity_records[0].type

    # Rendimiento por Tema, Sección y Autor
    topic_perf: Dict[str, Any] = {}
    section_perf: Dict[str, Any] = {}
    author_perf: Dict[str, Any] = {}
    top_articles_list = []

    for a in articles:
        article_er = (a.engaged_sessions / a.sessions * 100) if a.sessions and a.sessions > 0 else 0
        top_articles_list.append({
            "title": a.titulo_url,
            "er": round(article_er, 1),
            "sessions": a.sessions,
            "date": a.fecha_url.strftime('%Y-%m-%d') if a.fecha_url else "N/A"
        })

        t = a.tema_principal or "Sin Tema"
        if t not in topic_perf:
            topic_perf[t] = {"s": 0, "e": 0}
        topic_perf[t]["s"] += (a.sessions or 0)
        topic_perf[t]["e"] += (a.engaged_sessions or 0)

        s = a.seccion or "Sin Sección"
        if s not in section_perf:
            section_perf[s] = {"s": 0, "e": 0}
        section_perf[s]["s"] += (a.sessions or 0)
        section_perf[s]["e"] += (a.engaged_sessions or 0)

        au = a.autor or "Desconocido"
        if au not in author_perf:
            author_perf[au] = {"s": 0, "e": 0}
        author_perf[au]["s"] += (a.sessions or 0)
        author_perf[au]["e"] += (a.engaged_sessions or 0)

    best_topics = sorted(
        [{"topic": t, "er": round((v["e"] / v["s"] * 100) if v["s"] > 0 else 0, 1), "sessions": v["s"]} for t, v in topic_perf.items()],
        key=lambda x: x["er"], reverse=True
    )
    best_sections = sorted(
        [{"section": s, "er": round((v["e"] / v["s"] * 100) if v["s"] > 0 else 0, 1), "sessions": v["s"]} for s, v in section_perf.items()],
        key=lambda x: x["er"], reverse=True
    )
    best_author = None
    best_author_er = -1
    for au, v in author_perf.items():
        if au != "Desconocido" and v["s"] >= 10:
            er_val = (v["e"] / v["s"] * 100)
            if er_val > best_author_er:
                best_author_er = er_val
                best_author = au
    if not best_author and author_perf:
        valid_authors = {k: v for k, v in author_perf.items() if k != "Desconocido"}
        if valid_authors:
            best_author = max(valid_authors.items(), key=lambda x: x[1]['e'])[0]

    top_articles_list.sort(key=lambda x: x["er"], reverse=True)

    # Entidades secundarias de la tabla de entidades
    secondary_rows = (
        db.query(models.Entity)
        .filter(
            models.Entity.dashboard_data_id.in_(article_ids),
            models.Entity.is_principal == False,  # noqa: E712
            models.Entity.name != entity,
        )
        .all()
    )

    secondary_map: Dict[str, Any] = {}
    for sec in secondary_rows:
        n = sec.name
        if n not in secondary_map:
            # Obtener el artículo padre para obtener datos de engagement
            parent = next((a for a in articles if a.id == sec.dashboard_data_id), None)
            secondary_map[n] = {
                "name": n,
                "type": sec.type or "Tema",
                "sessions": 0,
                "engaged_sessions": 0,
                "sem_sum": 0.0, "sem_count": 0,
                "syn_sum": 0.0, "syn_count": 0,
                "categories": {},
                "count": 0,
            }
        parent = next((a for a in articles if a.id == sec.dashboard_data_id), None)
        if parent:
            secondary_map[n]["sessions"] += parent.sessions or 0
            secondary_map[n]["engaged_sessions"] += parent.engaged_sessions or 0
            cat = parent.tema_principal or "Sin Categoría"
            secondary_map[n]["categories"][cat] = secondary_map[n]["categories"].get(cat, 0) + 1
        if sec.semantic_score is not None:
            secondary_map[n]["sem_sum"] += sec.semantic_score
            secondary_map[n]["sem_count"] += 1
        if sec.syntactic_score is not None:
            secondary_map[n]["syn_sum"] += sec.syntactic_score
            secondary_map[n]["syn_count"] += 1
        secondary_map[n]["count"] += 1

    # Combinaciones: nombres secundarios que aparecen junto a esta entidad
    combos = {n: d["count"] for n, d in secondary_map.items()}
    sorted_combos = sorted(combos.items(), key=lambda x: x[1], reverse=True)[:5]

    secondary_entities_list = []
    for name, data in secondary_map.items():
        er_val = (data["engaged_sessions"] / data["sessions"] * 100) if data["sessions"] > 0 else 0
        sem = (data["sem_sum"] / data["sem_count"]) if data["sem_count"] > 0 else 0
        syn = (data["syn_sum"] / data["syn_count"]) if data["syn_count"] > 0 else 0
        best_cat = max(data["categories"].items(), key=lambda x: x[1])[0] if data["categories"] else "General"
        insight = f"Vincular {name} con {entity} en el mismo artículo aumenta significativamente el tiempo de lectura y retención de audiencia."
        secondary_entities_list.append({
            "name": name,
            "type": data["type"],
            "er": round(er_val, 1),
            "category": best_cat,
            "semantic": int(round(sem * 100)) if sem <= 1 else int(round(sem)),
            "syntactic": int(round(syn * 100)) if syn <= 1 else int(round(syn)),
            "insight": insight,
        })

    secondary_entities_list.sort(key=lambda x: x["er"], reverse=True)
    secondary_entities_list = secondary_entities_list[:10]

    data_insights = {
        "ideal_section": best_sections[0]["section"] if best_sections else None,
        "best_topic": best_topics[0]["topic"] if best_topics else None,
        "suggested_combo": sorted_combos[0][0] if sorted_combos else None,
        "top_author": best_author,
    }

    return {
        "entity": entity,
        "type": main_entity_type,
        "metrics": {
            "engagement": round(avg_er, 1),
            "semantic": int(round(avg_sem * 100)) if avg_sem <= 1.0 else int(round(avg_sem)),
            "syntactic": int(round(avg_syn * 100)) if avg_syn <= 1.0 else int(round(avg_syn)),
            "total_sessions": total_sess,
        },
        "best_topics": best_topics[:5],
        "suggested_partners": [c[0] for c in sorted_combos],
        "secondary_entities": secondary_entities_list,
        "top_articles": top_articles_list[:3],
        "data_insights": data_insights,
    }

# Tab 4: Reach ("¿A cuánta gente llegamos?")
@router.get("/reach")
def get_reach_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    source: Optional[List[str]] = Query(None),
    section: Optional[List[str]] = Query(None),
    author: Optional[List[str]] = Query(None),
    topic: Optional[List[str]] = Query(None),
    category: Optional[List[str]] = Query(None),
    db: Session = Depends(dependencies.get_db),
    user = Depends(dependencies.check_permission("dashboard"))
):
    # Usuarios Únicos por Sección
    users_by_section = apply_filters(db.query(
        models.DashboardData.seccion,
        func.sum(models.DashboardData.total_users).label('users')
    ), start_date, end_date, source, section, author, topic, category).group_by(models.DashboardData.seccion).order_by(desc('users')).all()
    
    # Vistas de página por Tema
    views_by_topic = apply_filters(db.query(
        models.DashboardData.tema_principal,
        func.sum(models.DashboardData.screen_page_views).label('views')
    ), start_date, end_date, source, section, author, topic, category).group_by(models.DashboardData.tema_principal).order_by(desc('views')).limit(20).all()
    
    # Ratio de profundidad por sección (Vistas de página / Sesiones)
    depth_query = apply_filters(db.query(
        models.DashboardData.seccion,
        func.sum(models.DashboardData.screen_page_views).label('views'),
        func.sum(models.DashboardData.sessions).label('sessions')
    ), start_date, end_date, source, section, author, topic, category).group_by(models.DashboardData.seccion).all()
    
    depth_data = []
    for d in depth_query:
        if not d.seccion: continue
        ratio = (d.views / d.sessions) if d.sessions > 0 else 0
        depth_data.append({
            "section": d.seccion,
            "depth_ratio": round(ratio, 2)
        })
    depth_data.sort(key=lambda x: x['depth_ratio'], reverse=True)

    return {
        "users_by_section": [{"section": u.seccion, "users": u.users} for u in users_by_section if u.seccion],
        "views_by_topic": [{"topic": t.tema_principal, "views": t.views} for t in views_by_topic if t.tema_principal],
        "depth_by_section": depth_data
    }

# Tab 5: Audience ("¿Quién nos lee?")
@router.get("/audience")
def get_audience_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    source: Optional[List[str]] = Query(None),
    section: Optional[List[str]] = Query(None),
    author: Optional[List[str]] = Query(None),
    topic: Optional[List[str]] = Query(None),
    category: Optional[List[str]] = Query(None),
    db: Session = Depends(dependencies.get_db),
    user = Depends(dependencies.check_permission("dashboard"))
):
    # Fidelidad por Sección (Sesiones / Usuarios)
    fidelity_query = apply_filters(db.query(
        models.DashboardData.seccion,
        func.sum(models.DashboardData.sessions).label('sessions'),
        func.sum(models.DashboardData.total_users).label('users'),
        func.sum(models.DashboardData.engaged_sessions).label('engaged_sessions')
    ), start_date, end_date, source, section, author, topic, category).group_by(models.DashboardData.seccion).all()
    
    # Calcular la fidelidad promedio global para "Semáforo"
    total_sess = sum([f.sessions or 0 for f in fidelity_query])
    total_users = sum([f.users or 0 for f in fidelity_query])
    global_fidelity = (total_sess / total_users) if total_users > 0 else 0
    
    audience_data = []
    for f in fidelity_query:
        if not f.seccion: continue
        fid = (f.sessions / f.users) if f.users > 0 else 0
        er = (f.engaged_sessions / f.sessions * 100) if f.sessions > 0 else 0
        
        audience_data.append({
            "section": f.seccion,
            "fidelity": round(fid, 2),
            "fidelity_status": "green" if fid >= global_fidelity else "red",
            "engagement_rate": round(er, 2),
            "share_of_volume": 0 
        })
    
    return {
        "global_fidelity": round(global_fidelity, 2),
        "sections": audience_data
    }

@router.get("/filters")
def get_dashboard_filters(db: Session = Depends(dependencies.get_db), user = Depends(dependencies.check_permission("dashboard"))):
    authors = db.query(models.DashboardData.autor).distinct().all()
    topics = db.query(models.DashboardData.tema_principal).distinct().all()
    categories = db.query(models.DashboardData.categoria_entidad).distinct().all()
    sections = db.query(models.DashboardData.seccion).distinct().all()
    sources = db.query(models.DashboardData.fuente).distinct().all()
    
    return {
        "authors": sorted([a[0] for a in authors if a[0]]),
        "topics": sorted([t[0] for t in topics if t[0]]),
        "categories": sorted([c[0] for c in categories if c[0]]),
        "sections": sorted([s[0] for s in sections if s[0]]),
        "sources": sorted([s[0] for s in sources if s[0]])
    }

