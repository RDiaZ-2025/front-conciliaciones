import pandas as pd
import os
import sys
import json
import time
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from openai import OpenAI

# Ensure backend root is in PYTHONPATH so we can import 'database' and 'modules'
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))
if backend_root not in sys.path:
    sys.path.append(backend_root)

from modules.portal.dashboard import models
from database import SessionLocal, engine

# Cargar variables de entorno de backend
load_dotenv(os.path.join(backend_root, '.env'))
openai_api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=openai_api_key) if openai_api_key else None


# ── IA y Web Scraping ────────────────────────────────────────────────────────

def scrape_article_text(url: str) -> str:
    """Extrae el texto principal de una URL."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
        }
        if not url.startswith("http"):
            url = f"https://{url}"
            
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        paragraphs = soup.find_all('p')
        text = " ".join([p.get_text(strip=True) for p in paragraphs])
        
        return text[:10000]
    except Exception as e:
        print(f"Error scraping {url}: {e}")
        return ""

def analyze_with_openai(text: str) -> str:
    """Envía el texto a ChatGPT para extraer las entidades exactas."""
    if not text or len(text.strip()) < 50:
        return ""
    if not client:
        print("Error: Cliente OpenAI no inicializado (revisa tu .env).")
        return ""

    system_prompt = (
        "Eres un experto en extracción de entidades (NER) y análisis semántico para contenido periodístico. "
        "Tu tarea es leer el texto y extraer entidades, retornando un objeto JSON estricto."
    )
    
    user_prompt = f"""Analiza el siguiente artículo y extrae las entidades clave.

REGLAS ESTRICTAS:
1. Debes extraer exactamente UNA (1) entidad principal ('main_entity').
2. Debes extraer exactamente TRES (3) entidades secundarias en el arreglo 'related_entities'.
3. El formato de respuesta debe ser EXCLUSIVAMENTE JSON, sin texto adicional y SIN bloques de código, solo el texto raw del JSON.
4. Para cada entidad asigna un 'semantic_score' (qué tan relevante es la entidad en el significado general, de 0.0 a 1.0) y un 'syntactic_score' (frecuencia/importancia estructural en el texto, de 0.0 a 1.0).
5. Asigna a cada entidad un 'type' o categoría descriptiva (ej: Persona, Organización, Lugar, Tema, Evento).

El esquema esperado exacto es:
{{
  "main_entity": {{
    "name": "Nombre de la entidad",
    "type": "Categoría",
    "semantic_score": 0.95,
    "syntactic_score": 0.90,
    "related_entities": [
      {{
        "name": "Entidad secundaria 1",
        "type": "Categoría",
        "semantic_score": 0.85,
        "syntactic_score": 0.80
      }},
      {{
        "name": "Entidad secundaria 2",
        "type": "Categoría",
        "semantic_score": 0.75,
        "syntactic_score": 0.70
      }},
      {{
        "name": "Entidad secundaria 3",
        "type": "Categoría",
        "semantic_score": 0.65,
        "syntactic_score": 0.60
      }}
    ]
  }}
}}

TEXTO A ANALIZAR:
{text}
"""
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            max_tokens=800,
            response_format={ "type": "json_object" }
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error con OpenAI API: {e}")
        return ""

def process_pending_ai_analysis(db, articles=None):
    """
    Realiza el scraping y consulta a OpenAI para aquellos artículos
    que no tienen 'analisis_gemini_raw'.
    """
    if articles is None:
        from datetime import date
        
        query = db.query(models.DashboardData).filter(
            models.DashboardData.clean_url.isnot(None),
            (models.DashboardData.analisis_gemini_raw == None) | (models.DashboardData.analisis_gemini_raw == "")
        )
        
        # [AQUÍ PONES LA FECHA] 
        # Si quieres filtrar por un día exacto, descomenta la siguiente línea y pon tu fecha:
        query = query.filter(models.DashboardData.fecha_url == date(2026, 5, 11))
        
        # Límite de seguridad: Procesar máximo 50 a la vez para no consumir muchos tokens de golpe.
        # Puedes cambiar el 50 por el número que desees.
        articles = query.limit(50).all()
        
    if not articles:
        return 0

    print(f"Iniciando análisis AI para {len(articles)} artículos...")
    processed_count = 0
    for art in articles:
        if not art.clean_url or art.analisis_gemini_raw:
            continue
            
        print(f"Analizando: {art.clean_url}")
        text = scrape_article_text(art.clean_url)
        if text:
            json_res = analyze_with_openai(text)
            if json_res:
                art.analisis_gemini_raw = json_res
                db.commit()
                processed_count += 1
                print("  -> Análisis de IA guardado exitosamente.")
            else:
                print("  -> Falló el análisis de OpenAI.")
        else:
            print("  -> No se pudo extraer texto del artículo.")
        time.sleep(1)
        
    return processed_count


# ── Helpers ──────────────────────────────────────────────────────────────────

def _infer_type(name: str) -> str:
    """Heuristic to infer entity type from its name (fallback si la IA no lo da)."""
    if not name:
        return "Tema"
    words = name.strip().split()
    org_keywords = ["ministerio", "gobierno", "alcaldía", "alcaldia", "partido", "empresa",
                    "corporación", "corporacion", "institución", "institucion", "banco",
                    "universidad", "club", "liga", "federación", "federacion", "congreso",
                    "senado", "ejército", "ejercito", "policía", "policia", "fiscalía", "fiscalia"]
    loc_keywords = ["bogotá", "bogota", "colombia", "medellín", "medellin", "cali", "barranquilla",
                    "cartagena", "bucaramanga", "cúcuta", "cucuta", "pereira", "manizales",
                    "departamento", "municipio", "ciudad", "región", "region", "provincia"]
    name_lower = name.lower()
    for kw in org_keywords:
        if kw in name_lower:
            return "Organización"
    for kw in loc_keywords:
        if kw in name_lower:
            return "Lugar"
    if len(words) >= 2 and all(w[0].isupper() for w in words if w):
        return "Persona"
    return "Tema"


# ── Main population logic ─────────────────────────────────────────────────────

def populate_entities(db, article_ids=None):
    """
    Reads rows of dashboard_data, parses analisis_gemini_raw and
    creates Entity records (principal + secondary).
    """
    if article_ids is not None:
        if not article_ids:
            return 0
        db.query(models.Entity).filter(models.Entity.dashboard_data_id.in_(article_ids)).delete(synchronize_session=False)
        db.flush()
        articles = db.query(models.DashboardData).filter(models.DashboardData.id.in_(article_ids)).all()
    else:
        db.query(models.Entity).delete()
        db.flush()
        articles = db.query(models.DashboardData).all()
    total_entities = 0

    for art in articles:
        new_entities = []

        # ── 1. Try to extract from the Gemini JSON ────────────────────────
        if art.analisis_gemini_raw:
            try:
                raw = json.loads(art.analisis_gemini_raw)
                main_opt = raw.get("main_entity", {})

                # ── Principal entity ──────────────────────────────────────
                main_name = main_opt.get("name") or art.entidad_principal
                if main_name:
                    main_sem = main_opt.get("semantic_score") or art.semantic_score or 0.0
                    main_syn = main_opt.get("syntactic_score") or art.syntactic_score or 0.0
                    main_type = main_opt.get("type") or _infer_type(main_name)

                    new_entities.append(models.Entity(
                        dashboard_data_id=art.id,
                        name=str(main_name),
                        type=main_type,
                        is_principal=True,
                        semantic_score=float(main_sem),
                        syntactic_score=float(main_syn),
                    ))

                # ── Secondary entities ────────────────────────────────────
                for rel in main_opt.get("related_entities", []):
                    rel_name = rel.get("name")
                    if not rel_name:
                        continue

                    rel_sem = rel.get("semantic_score")
                    rel_syn = rel.get("syntactic_score")

                    # Usamos valores estrictamente dados por la IA (o 0.0 si faltan). 
                    # Ya no simulamos puntajes falsos.
                    if rel_sem is None:
                        rel_sem = 0.0
                    if rel_syn is None:
                        rel_syn = 0.0

                    rel_type = rel.get("type") or _infer_type(rel_name)

                    new_entities.append(models.Entity(
                        dashboard_data_id=art.id,
                        name=str(rel_name),
                        type=rel_type,
                        is_principal=False,
                        semantic_score=float(rel_sem),
                        syntactic_score=float(rel_syn),
                    ))

            except Exception:
                pass  # If JSON is broken, fall back to columns below

        # ── 2. Fallback: use legacy columns if no JSON worked ─────────────
        if not new_entities and art.entidad_principal:
            new_entities.append(models.Entity(
                dashboard_data_id=art.id,
                name=str(art.entidad_principal),
                type=_infer_type(art.entidad_principal),
                is_principal=True,
                semantic_score=float(art.semantic_score) if art.semantic_score is not None else 0.0,
                syntactic_score=float(art.syntactic_score) if art.syntactic_score is not None else 0.0,
            ))

        db.bulk_save_objects(new_entities)
        total_entities += len(new_entities)

    db.commit()
    return total_entities


# ── Full import (from Excel o GA4) ────────────────────────────────────────────

def import_data(file_name: str = "Gemini.xlsx"):
    """
    Imports data from an Excel file into dashboard_data, process new articles
    with OpenAI, and repopulates the entities table.
    """
    rutas_a_intentar = [
        os.path.join(backend_root, '..', file_name),  # /red+/Gemini.xlsx
        os.path.join(os.getcwd(), file_name),
        os.path.join(os.path.dirname(__file__), file_name),
    ]
    
    file_path = None
    for ruta in rutas_a_intentar:
        if os.path.exists(ruta):
            file_path = ruta
            break
            
    if not file_path:
        print(f"Warning: File {file_name} not found. Skipping import.")
        return

    db = SessionLocal()
    try:
        models.Base.metadata.create_all(bind=engine)

        existing_urls = {r[0] for r in db.query(models.DashboardData.clean_url).filter(models.DashboardData.clean_url.isnot(None)).all()}
        existing_titles = {r[0] for r in db.query(models.DashboardData.titulo_url).filter(models.DashboardData.titulo_url.isnot(None)).all()}

        df = pd.read_excel(file_path)

        new_entries = []
        for _, row in df.iterrows():
            clean_url = row.get("clean_url")
            titulo_url = row.get("titulo_url")
            
            if pd.notna(clean_url) and str(clean_url) in existing_urls:
                continue
            if pd.notna(titulo_url) and str(titulo_url) in existing_titles and pd.isna(clean_url):
                continue

            fecha = pd.to_datetime(row.get("fecha_url"))
            new_entry = models.DashboardData(
                rank_seccion=row.get("rank_seccion"),
                mes=row.get("mes"),
                seccion=row.get("seccion"),
                fecha_url=fecha.date() if pd.notnull(fecha) else None,
                clean_url=row.get("clean_url"),
                titulo_url=row.get("titulo_url"),
                autor=row.get("autor"),
                total_users=row.get("total_users"),
                screen_page_views=row.get("screen_page_views"),
                sessions=row.get("sessions"),
                engaged_sessions=row.get("engaged_sessions"),
                tema_principal=row.get("tema_principal"),
                fuente=row.get("fuente", "Discover"),
                analisis_gemini_raw=row.get("analisis_gemini_raw"),
            )
            new_entries.append(new_entry)

        if not new_entries:
            print("No se encontraron registros nuevos para importar (todos ya existen).")
            return

        db.add_all(new_entries)
        db.commit()
        print(f"Dashboard data: {len(new_entries)} nuevos registros importados desde {file_path}")

        # Ejecutamos el pipeline de IA para los nuevos registros insertados
        process_pending_ai_analysis(db, articles=new_entries)

        # Poblar la tabla de entidades para los registros nuevos
        new_article_ids = [entry.id for entry in new_entries]
        total = populate_entities(db, article_ids=new_article_ids)
        print(f"Entities populated successfully: {total} nuevos registros de entidades creados.")

    except Exception as e:
        db.rollback()
        print(f"Error importing data: {e}")
        raise e
    finally:
        db.close()


# ── Entry points ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    # Asegurar que las tablas existan
    models.Base.metadata.create_all(bind=engine)

    if "--populate-entities" in sys.argv:
        print("Populating entities from existing dashboard_data...")
        db = SessionLocal()
        try:
            # Opcional: Procesar AI para los faltantes antes de poblar.
            process_pending_ai_analysis(db)
            total = populate_entities(db)
            print(f"Done! {total} entity records created.")
        finally:
            db.close()
    else:
        import_data("Gemini.xlsx")
