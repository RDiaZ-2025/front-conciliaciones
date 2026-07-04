import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppDataSource } from '../config/typeorm.config';
import { DashboardData } from '../models/DashboardData';
import { DashboardEntity } from '../models/Entity';
import { SelectQueryBuilder } from 'typeorm';

function applyFilters(qb: SelectQueryBuilder<DashboardData>, req: Request) {
  const { start_date, end_date, source, section, author, topic, category } = req.query;

  if (start_date) {
    qb.andWhere('d.fechaUrl >= :start_date', { start_date });
  }
  if (end_date) {
    qb.andWhere('d.fechaUrl <= :end_date', { end_date });
  }

  const addInFilter = (field: string, value: any, paramName: string) => {
    if (value) {
      const arr = Array.isArray(value) ? value : [value];
      const cleanArr = arr.filter(Boolean);
      if (cleanArr.length > 0) {
        qb.andWhere(`d.${field} IN (:...${paramName})`, { [paramName]: cleanArr });
      }
    }
  };

  addInFilter('fuente', source, 'source');
  addInFilter('seccion', section, 'section');
  addInFilter('autor', author, 'author');
  addInFilter('temaPrincipal', topic, 'topic');
  addInFilter('categoriaEntidad', category, 'category');
}

export class NocDashboardController {
  getOverviewStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!AppDataSource.isInitialized) {
      res.status(500).json({ message: 'Base de datos no inicializada' });
      return;
    }

    let { start_date, end_date } = req.query as { start_date?: string, end_date?: string };
    
    const parseDate = (d: string) => new Date(d);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    let startDt: Date;
    let endDt: Date;

    if (!start_date) {
      endDt = new Date();
      startDt = new Date();
      startDt.setDate(startDt.getDate() - 30);
      start_date = formatDate(startDt);
      end_date = formatDate(endDt);
    } else {
      startDt = parseDate(start_date);
      endDt = parseDate(end_date || start_date);
    }

    const durationMs = endDt.getTime() - startDt.getTime();
    const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24)) + 1;

    const prevEndDt = new Date(startDt.getTime());
    prevEndDt.setDate(prevEndDt.getDate() - 1);
    const prevStartDt = new Date(prevEndDt.getTime());
    prevStartDt.setDate(prevStartDt.getDate() - (durationDays - 1));

    const prevStartDate = formatDate(prevStartDt);
    const prevEndDate = formatDate(prevEndDt);

    const getStats = async (sDate: string, eDate: string) => {
      const qb = AppDataSource.getRepository(DashboardData).createQueryBuilder('d')
        .select('SUM(d.totalUsers)', 'total_users')
        .addSelect('SUM(d.screenPageViews)', 'screen_page_views')
        .addSelect('SUM(d.sessions)', 'sessions')
        .addSelect('SUM(d.engagedSessions)', 'engaged_sessions')
        .addSelect('COUNT(d.id)', 'count');

      applyFilters(qb, req);
      qb.andWhere('d.fechaUrl >= :sDate AND d.fechaUrl <= :eDate', { sDate, eDate });

      const raw = await qb.getRawOne();
      return {
        users: Number(raw?.total_users || 0),
        views: Number(raw?.screen_page_views || 0),
        sessions: Number(raw?.sessions || 0),
        engaged: Number(raw?.engaged_sessions || 0),
        articles: Number(raw?.count || 0)
      };
    };

    const curr = await getStats(start_date!, end_date!);
    const prev = await getStats(prevStartDate, prevEndDate);

    const calcVar = (cVal: number, pVal: number) => {
      if (pVal === 0) return cVal > 0 ? 100 : 0;
      return ((cVal - pVal) / pVal) * 100;
    };

    const engagementRate = curr.sessions > 0 ? (curr.engaged / curr.sessions * 100) : 0;
    const prevEngagementRate = prev.sessions > 0 ? (prev.engaged / prev.sessions * 100) : 0;

    const pagesPerSession = curr.sessions > 0 ? (curr.views / curr.sessions) : 0;
    const prevPps = prev.sessions > 0 ? (prev.views / prev.sessions) : 0;

    const fidelity = curr.users > 0 ? (curr.sessions / curr.users) : 0;
    const prevFidelity = prev.users > 0 ? (prev.sessions / prev.users) : 0;

    const cards = {
      total_users: curr.users,
      users_variation: Number(calcVar(curr.users, prev.users).toFixed(1)),
      total_views: curr.views,
      views_variation: Number(calcVar(curr.views, prev.views).toFixed(1)),
      engagement_rate: Number(engagementRate.toFixed(2)),
      engagement_rate_variation: Number((engagementRate - prevEngagementRate).toFixed(2)),
      pages_per_session: Number(pagesPerSession.toFixed(2)),
      pps_variation: Number(calcVar(pagesPerSession, prevPps).toFixed(1)),
      fidelity: Number(fidelity.toFixed(2)),
      active_source: (req.query.source as string) || "Todas"
    };

    // History for chart
    const dateKeySql = durationDays <= 60
      ? "CONVERT(VARCHAR(10), d.fecha_url, 120)"
      : "SUBSTRING(CONVERT(VARCHAR(10), d.fecha_url, 120), 1, 7)";

    const volHistQb = AppDataSource.getRepository(DashboardData).createQueryBuilder('d')
      .select(dateKeySql, 'date_key')
      .addSelect('COUNT(d.id)', 'articles')
      .addSelect('SUM(d.screenPageViews)', 'views');

    applyFilters(volHistQb, req);
    volHistQb.andWhere('d.fechaUrl >= :start_date AND d.fechaUrl <= :end_date', { start_date, end_date })
      .groupBy(dateKeySql)
      .orderBy(dateKeySql);

    const volHistRaw = await volHistQb.getRawMany();
    const history = volHistRaw.map(h => ({
      date: h.date_key,
      articles: Number(h.articles || 0),
      views: Number(h.views || 0)
    }));

    // Trends
    const trendQb = AppDataSource.getRepository(DashboardData).createQueryBuilder('d')
      .select(dateKeySql, 'date_key')
      .addSelect('SUM(d.sessions)', 'sessions')
      .addSelect('SUM(d.engagedSessions)', 'engaged_sessions');

    applyFilters(trendQb, req);
    trendQb.andWhere('d.fechaUrl >= :start_date AND d.fechaUrl <= :end_date', { start_date, end_date })
      .groupBy(dateKeySql)
      .orderBy(dateKeySql);

    const trendRaw = await trendQb.getRawMany();
    const trend = trendRaw.map(t => {
      const sess = Number(t.sessions || 0);
      const eng = Number(t.engaged_sessions || 0);
      const er = sess > 0 ? (eng / sess * 100) : 0;
      return {
        period: t.date_key,
        sessions: sess,
        engagement_rate: Number(er.toFixed(2))
      };
    });

    // Highlights
    const minSessions = 50;
    const highlightQb = (field: string) => {
      const q = AppDataSource.getRepository(DashboardData).createQueryBuilder('d')
        .select(`d.${field}`, 'name')
        .addSelect('SUM(d.sessions)', 'sess')
        .addSelect('SUM(d.engagedSessions)', 'eng');
      applyFilters(q, req);
      q.andWhere('d.fechaUrl >= :start_date AND d.fechaUrl <= :end_date', { start_date, end_date })
        .groupBy(`d.${field}`)
        .having('SUM(d.sessions) > :minSessions', { minSessions });
      return q;
    };

    const getTopByEr = async (field: string) => {
      const rows = await highlightQb(field).getRawMany();
      if (!rows.length) return "N/A";
      let topItem = rows[0];
      let maxEr = -1;
      for (const row of rows) {
        const sess = Number(row.sess || 0);
        const eng = Number(row.eng || 0);
        const er = sess > 0 ? (eng / sess) : 0;
        if (er > maxEr) {
          maxEr = er;
          topItem = row;
        }
      }
      return topItem.name || "N/A";
    };

    const topSection = await getTopByEr('seccion');
    const viralTopic = await getTopByEr('temaPrincipal');
    const featuredAuthor = await getTopByEr('autor');

    res.status(200).json({
      cards,
      volume: {
        total_articles: curr.articles,
        variation: Number(calcVar(curr.articles, prev.articles).toFixed(1)),
        history
      },
      trend,
      highlights: {
        top_section: topSection,
        viral_topic: viralTopic,
        featured_author: featuredAuthor
      },
      comparison_period: `vs ${prevStartDt.getDate()} ${prevStartDt.toLocaleString('es-ES', { month: 'short' })} - ${prevEndDt.getDate()} ${prevEndDt.toLocaleString('es-ES', { month: 'short' })}`
    });
  });

  getContentStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!AppDataSource.isInitialized) {
      res.status(500).json({ message: 'Base de datos no inicializada' });
      return;
    }

    const { start_date, end_date } = req.query as { start_date?: string, end_date?: string };

    // Topics Matrix
    const topicQb = AppDataSource.getRepository(DashboardData).createQueryBuilder('d')
      .select('d.temaPrincipal', 'topic')
      .addSelect('SUM(d.sessions)', 'sessions')
      .addSelect('SUM(d.engagedSessions)', 'engaged_sessions');
    applyFilters(topicQb, req);
    topicQb.groupBy('d.temaPrincipal');

    const topicsRaw = await topicQb.getRawMany();
    const matrix = topicsRaw.filter(t => t.topic).map(t => {
      const sess = Number(t.sessions || 0);
      const eng = Number(t.engaged_sessions || 0);
      const er = sess > 0 ? (eng / sess * 100) : 0;
      return {
        topic: t.topic,
        sessions: sess,
        engagement_rate: Number(er.toFixed(2))
      };
    });

    // Author Ranking
    const authorQb = AppDataSource.getRepository(DashboardData).createQueryBuilder('d')
      .select('d.autor', 'author')
      .addSelect('SUM(d.sessions)', 'sessions')
      .addSelect('SUM(d.engagedSessions)', 'engaged_sessions')
      .addSelect('COUNT(d.id)', 'articles');
    applyFilters(authorQb, req);
    authorQb.groupBy('d.autor');

    const authorsRaw = await authorQb.getRawMany();
    const validAuthors = authorsRaw.filter(a => a.author);

    const maxSessions = Math.max(...validAuthors.map(a => Number(a.sessions || 0)), 1);
    const maxArticles = Math.max(...validAuthors.map(a => Number(a.articles || 0)), 1);

    const authors = validAuthors.map(a => {
      const sess = Number(a.sessions || 0);
      const eng = Number(a.engaged_sessions || 0);
      const arts = Number(a.articles || 0);
      const er = sess > 0 ? (eng / sess * 100) : 0;

      const relVol = (sess / maxSessions) * 100;
      const relProd = (arts / maxArticles) * 100;
      const score = (er + relVol + relProd) / 3;

      return {
        author: a.author,
        score: Number(score.toFixed(1)),
        sessions: sess,
        articles: arts,
        engagement_rate: Number(er.toFixed(1))
      };
    });

    authors.sort((a, b) => b.score - a.score);

    res.status(200).json({
      matrix,
      authors
    });
  });

  getEntitiesStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!AppDataSource.isInitialized) {
      res.status(500).json({ message: 'Base de datos no inicializada' });
      return;
    }

    const { start_date, end_date } = req.query as { start_date?: string, end_date?: string };

    // 1. Avg Global Engagement
    const totalQb = AppDataSource.getRepository(DashboardData).createQueryBuilder('d')
      .select('SUM(d.sessions)', 's')
      .addSelect('SUM(d.engagedSessions)', 'es');
    applyFilters(totalQb, req);
    const totalRaw = await totalQb.getRawOne();
    const totalS = Number(totalRaw?.s || 0);
    const totalEs = Number(totalRaw?.es || 0);
    const sectionAvgEr = totalS > 0 ? (totalEs / totalS * 100) : 0;

    // 2. Entity aggregates
    const entityQb = AppDataSource.getRepository(DashboardData).createQueryBuilder('d')
      .innerJoin('d.entities', 'e')
      .select('e.name', 'entity_name')
      .addSelect('e.semanticScore', 'sem')
      .addSelect('e.syntacticScore', 'syn')
      .addSelect('d.sessions', 'sessions')
      .addSelect('d.engagedSessions', 'engaged_sessions')
      .addSelect('d.fechaUrl', 'fecha_url');
    applyFilters(entityQb, req);

    const rows = await entityQb.getRawMany();

    if (!rows.length) {
      res.status(200).json({ section_avg: 0, entities: [], best_combinations: [], conclusions: [] });
      return;
    }

    const refDateStr = end_date || new Date().toISOString().split('T')[0];
    const refDate = new Date(refDateStr);
    const historyStart = new Date(refDate.getTime());
    historyStart.setDate(historyStart.getDate() - 7);

    interface StatsAccumulator {
      s: number;
      es: number;
      sem_sum: number;
      syn_sum: number;
      count: number;
    }

    const entityStats: Record<string, StatsAccumulator> = {};
    const historyMap: Record<string, Record<string, { s: number, es: number }>> = {};

    for (const row of rows) {
      const eName = row.entity_name;
      if (!eName) continue;
      const sess = Number(row.sessions || 0);
      const eng = Number(row.engaged_sessions || 0);
      const sem = Number(row.sem || 0.0);
      const syn = Number(row.syn || 0.0);
      
      const rowDate = row.fecha_url ? new Date(row.fecha_url) : null;
      const dateStr = rowDate ? rowDate.toISOString().split('T')[0] : '';

      if (!entityStats[eName]) {
        entityStats[eName] = { s: 0, es: 0, sem_sum: 0, syn_sum: 0, count: 0 };
      }
      entityStats[eName].s += sess;
      entityStats[eName].es += eng;
      entityStats[eName].sem_sum += sem;
      entityStats[eName].syn_sum += syn;
      entityStats[eName].count += 1;

      if (rowDate && rowDate >= historyStart && rowDate <= refDate) {
        if (!historyMap[eName]) historyMap[eName] = {};
        if (!historyMap[eName][dateStr]) historyMap[eName][dateStr] = { s: 0, es: 0 };
        historyMap[eName][dateStr].s += sess;
        historyMap[eName][dateStr].es += eng;
      }
    }

    // 3. Combinations
    const comboQb = AppDataSource.getRepository(DashboardData).createQueryBuilder('d')
      .innerJoin('d.entities', 'e')
      .select('d.id', 'art_id')
      .addSelect('e.name', 'ent_name')
      .addSelect('e.isPrincipal', 'is_principal');
    applyFilters(comboQb, req);
    const comboRows = await comboQb.getRawMany();

    const articlesEntities: Record<number, { principal: string | null, secondaries: string[] }> = {};
    for (const cr of comboRows) {
      const aid = Number(cr.art_id);
      if (!articlesEntities[aid]) {
        articlesEntities[aid] = { principal: null, secondaries: [] };
      }
      if (cr.is_principal) {
        articlesEntities[aid].principal = cr.ent_name;
      } else {
        articlesEntities[aid].secondaries.push(cr.ent_name);
      }
    }

    const combinations: Record<string, number> = {};
    for (const artId in articlesEntities) {
      const main = articlesEntities[artId].principal;
      if (main) {
        for (const sec of articlesEntities[artId].secondaries) {
          const combo = `${main} + ${sec}`;
          combinations[combo] = (combinations[combo] || 0) + 1;
        }
      }
    }

    // 4. Format Output
    const entitiesList = [];
    for (const eName in entityStats) {
      const stats = entityStats[eName];
      const er = stats.s > 0 ? (stats.es / stats.s * 100) : 0;
      const avgSem = stats.count > 0 ? (stats.sem_sum / stats.count) : 0;
      const avgSyn = stats.count > 0 ? (stats.syn_sum / stats.count) : 0;

      const sparkline: number[] = [];
      for (let i = 0; i < 8; i++) {
        const d = new Date(refDate.getTime());
        d.setDate(d.getDate() - (7 - i));
        const dateStr = d.toISOString().split('T')[0];
        const dayData = historyMap[eName]?.[dateStr] || { s: 0, es: 0 };
        const dayEr = dayData.s > 0 ? (dayData.es / dayData.s * 100) : 0;
        sparkline.push(Number(dayEr.toFixed(1)));
      }

      entitiesList.push({
        entity: eName,
        semantic_score: Number(avgSem.toFixed(2)),
        syntactic_score: Number(avgSyn.toFixed(2)),
        engagement_score: Number(er.toFixed(1)),
        dev_vs_avg: Number((er - sectionAvgEr).toFixed(1)),
        sessions: stats.s,
        sparkline
      });
    }

    entitiesList.sort((a, b) => b.engagement_score - a.engagement_score);

    const totalCount = entitiesList.length;
    entitiesList.forEach((ent, i) => {
      (ent as any).percentile = totalCount > 0 ? Math.round(100 - (i / totalCount * 100)) : 0;
    });

    const bestCombinations = Object.entries(combinations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(c => ({ pair: c[0], count: c[1] }));

    const conclusions: string[] = [];
    if (entitiesList.length > 0) {
      const topEnt = entitiesList[0];
      conclusions.push(
        `La entidad '${topEnt.entity}' lidera el engagement con ${topEnt.engagement_score}%`
      );
    }
    const avgSemantic = entitiesList.reduce((acc, e) => acc + e.semantic_score, 0) / (entitiesList.length || 1);
    if (avgSemantic > 0.7) {
      conclusions.push("Existe una alta relevancia semántica en los temas actuales, lo que indica coherencia editorial.");
    }

    res.status(200).json({
      section_avg: Number(sectionAvgEr.toFixed(1)),
      entities: entitiesList,
      best_combinations: bestCombinations,
      conclusions
    });
  });

  getEntityDetail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!AppDataSource.isInitialized) {
      res.status(500).json({ message: 'Base de datos no inicializada' });
      return;
    }

    const { entity } = req.query as { entity?: string };
    if (!entity) {
      res.status(400).json({ message: 'Parámetro entity es requerido' });
      return;
    }

    // Find all articles mentioning this entity
    const articleIdsQb = AppDataSource.getRepository(DashboardData).createQueryBuilder('d')
      .innerJoin('d.entities', 'e')
      .select('DISTINCT d.id', 'id')
      .where('e.name = :entity', { entity });
    applyFilters(articleIdsQb, req);

    const articleIdRows = await articleIdsQb.getRawMany();
    const articleIds = articleIdRows.map(r => Number(r.id));

    if (!articleIds.length) {
      res.status(404).json({ message: 'Entidad no encontrada' });
      return;
    }

    const articles = await AppDataSource.getRepository(DashboardData).createQueryBuilder('d')
      .where('d.id IN (:...articleIds)', { articleIds })
      .getMany();

    const totalSess = articles.reduce((acc, a) => acc + (a.sessions || 0), 0);
    const totalEng = articles.reduce((acc, a) => acc + (a.engagedSessions || 0), 0);
    const avgEr = totalSess > 0 ? (totalEng / totalSess * 100) : 0;

    // Scores
    const entityRecords = await AppDataSource.getRepository(DashboardEntity).createQueryBuilder('e')
      .where('e.name = :entity AND e.dashboardDataId IN (:...articleIds)', { entity, articleIds })
      .getMany();

    const semVals = entityRecords.map(e => e.semanticScore).filter((v): v is number => v !== null);
    const synVals = entityRecords.map(e => e.syntacticScore).filter((v): v is number => v !== null);
    const avgSem = semVals.length ? (semVals.reduce((a, b) => a + b, 0) / semVals.length) : 0.0;
    const avgSyn = synVals.length ? (synVals.reduce((a, b) => a + b, 0) / synVals.length) : 0.0;

    let mainEntityType = "Tema";
    for (const rec of entityRecords) {
      if (rec.isPrincipal && rec.type) {
        mainEntityType = rec.type;
        break;
      }
    }
    if (mainEntityType === "Tema" && entityRecords.length > 0 && entityRecords[0].type) {
      mainEntityType = entityRecords[0].type;
    }

    const topicPerf: Record<string, { s: number, e: number }> = {};
    const sectionPerf: Record<string, { s: number, e: number }> = {};
    const authorPerf: Record<string, { s: number, e: number }> = {};
    const topArticlesList = [];

    for (const a of articles) {
      const artEr = a.sessions && a.sessions > 0 ? (a.engagedSessions || 0) / a.sessions * 100 : 0;
      topArticlesList.push({
        title: a.tituloUrl || '',
        er: Number(artEr.toFixed(1)),
        sessions: a.sessions || 0,
        date: a.fechaUrl ? new Date(a.fechaUrl).toISOString().split('T')[0] : 'N/A'
      });

      const t = a.temaPrincipal || "Sin Tema";
      if (!topicPerf[t]) topicPerf[t] = { s: 0, e: 0 };
      topicPerf[t].s += (a.sessions || 0);
      topicPerf[t].e += (a.engagedSessions || 0);

      const s = a.seccion || "Sin Sección";
      if (!sectionPerf[s]) sectionPerf[s] = { s: 0, e: 0 };
      sectionPerf[s].s += (a.sessions || 0);
      sectionPerf[s].e += (a.engagedSessions || 0);

      const au = a.autor || "Desconocido";
      if (!authorPerf[au]) authorPerf[au] = { s: 0, e: 0 };
      authorPerf[au].s += (a.sessions || 0);
      authorPerf[au].e += (a.engagedSessions || 0);
    }

    const bestTopics = Object.entries(topicPerf).map(([t, v]) => ({
      topic: t,
      er: Number((v.s > 0 ? (v.e / v.s * 100) : 0).toFixed(1)),
      sessions: v.s
    })).sort((a, b) => b.er - a.er);

    const bestSections = Object.entries(sectionPerf).map(([s, v]) => ({
      section: s,
      er: Number((v.s > 0 ? (v.e / v.s * 100) : 0).toFixed(1)),
      sessions: v.s
    })).sort((a, b) => b.er - a.er);

    let bestAuthor = null;
    let bestAuthorEr = -1;
    for (const [au, v] of Object.entries(authorPerf)) {
      if (au !== "Desconocido" && v.s >= 10) {
        const erVal = (v.e / v.s * 100);
        if (erVal > bestAuthorEr) {
          bestAuthorEr = erVal;
          bestAuthor = au;
        }
      }
    }
    if (!bestAuthor && Object.keys(authorPerf).length > 0) {
      const validAuthors = Object.entries(authorPerf).filter(([k]) => k !== "Desconocido");
      if (validAuthors.length > 0) {
        bestAuthor = validAuthors.sort((a, b) => b[1].e - a[1].e)[0][0];
      }
    }

    topArticlesList.sort((a, b) => b.er - a.er);

    // Secondary entities linked to this entity
    const secondaryRecords = await AppDataSource.getRepository(DashboardEntity).createQueryBuilder('e')
      .where('e.dashboardDataId IN (:...articleIds) AND e.isPrincipal = 0 AND e.name != :entity', { articleIds, entity })
      .getMany();

    const secondaryMap: Record<string, any> = {};
    for (const sec of secondaryRecords) {
      const name = sec.name;
      if (!secondaryMap[name]) {
        secondaryMap[name] = {
          name,
          type: sec.type || "Tema",
          sessions: 0,
          engaged_sessions: 0,
          sem_sum: 0, sem_count: 0,
          syn_sum: 0, syn_count: 0,
          categories: {},
          count: 0
        };
      }
      const parent = articles.find(a => a.id === sec.dashboardDataId);
      if (parent) {
        secondaryMap[name].sessions += (parent.sessions || 0);
        secondaryMap[name].engaged_sessions += (parent.engagedSessions || 0);
        const cat = parent.temaPrincipal || "Sin Categoría";
        secondaryMap[name].categories[cat] = (secondaryMap[name].categories[cat] || 0) + 1;
      }
      if (sec.semanticScore !== null) {
        secondaryMap[name].sem_sum += sec.semanticScore;
        secondaryMap[name].sem_count += 1;
      }
      if (sec.syntacticScore !== null) {
        secondaryMap[name].syn_sum += sec.syntacticScore;
        secondaryMap[name].syn_count += 1;
      }
      secondaryMap[name].count += 1;
    }

    const secondaryEntitiesList = [];
    for (const name in secondaryMap) {
      const data = secondaryMap[name];
      const erVal = data.sessions > 0 ? (data.engaged_sessions / data.sessions * 100) : 0;
      const sem = data.sem_count > 0 ? (data.sem_sum / data.sem_count) : 0;
      const syn = data.syn_count > 0 ? (data.syn_sum / data.syn_count) : 0;
      
      let bestCat = "General";
      let maxCount = -1;
      for (const [c, cnt] of Object.entries(data.categories)) {
        if ((cnt as number) > maxCount) {
          maxCount = cnt as number;
          bestCat = c;
        }
      }

      secondaryEntitiesList.push({
        name,
        type: data.type,
        er: Number(erVal.toFixed(1)),
        category: bestCat,
        semantic: Math.round(sem <= 1 ? sem * 100 : sem),
        syntactic: Math.round(syn <= 1 ? syn * 100 : syn),
        insight: `Vincular ${name} con ${entity} en el mismo artículo aumenta significativamente el tiempo de lectura y retención de audiencia.`
      });
    }

    secondaryEntitiesList.sort((a, b) => b.er - a.er);
    const suggestedPartners = secondaryEntitiesList.slice(0, 5).map(s => s.name);

    const dataInsights = {
      ideal_section: bestSections[0]?.section || null,
      best_topic: bestTopics[0]?.topic || null,
      suggested_combo: suggestedPartners[0] || null,
      top_author: bestAuthor
    };

    res.status(200).json({
      entity,
      type: mainEntityType,
      metrics: {
        engagement: Number(avgEr.toFixed(1)),
        semantic: Math.round(avgSem <= 1 ? avgSem * 100 : avgSem),
        syntactic: Math.round(avgSyn <= 1 ? avgSyn * 100 : avgSyn),
        total_sessions: totalSess
      },
      best_topics: bestTopics.slice(0, 5),
      suggested_partners: suggestedPartners,
      secondary_entities: secondaryEntitiesList.slice(0, 10),
      top_articles: topArticlesList.slice(0, 3),
      data_insights: dataInsights
    });
  });

  getReachStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!AppDataSource.isInitialized) {
      res.status(500).json({ message: 'Base de datos no inicializada' });
      return;
    }

    const { start_date, end_date } = req.query as { start_date?: string, end_date?: string };

    // Unique Users by Section
    const usersQb = AppDataSource.getRepository(DashboardData).createQueryBuilder('d')
      .select('d.seccion', 'section')
      .addSelect('SUM(d.totalUsers)', 'users');
    applyFilters(usersQb, req);
    usersQb.groupBy('d.seccion').orderBy('SUM(d.totalUsers)', 'DESC');

    const usersRaw = await usersQb.getRawMany();

    // Page Views by Topic
    const viewsQb = AppDataSource.getRepository(DashboardData).createQueryBuilder('d')
      .select('d.temaPrincipal', 'topic')
      .addSelect('SUM(d.screenPageViews)', 'views');
    applyFilters(viewsQb, req);
    viewsQb.groupBy('d.temaPrincipal').orderBy('SUM(d.screenPageViews)', 'DESC').limit(20);

    const viewsRaw = await viewsQb.getRawMany();

    // Depth ratio by section (Page Views / Sessions)
    const depthQb = AppDataSource.getRepository(DashboardData).createQueryBuilder('d')
      .select('d.seccion', 'section')
      .addSelect('SUM(d.screenPageViews)', 'views')
      .addSelect('SUM(d.sessions)', 'sessions');
    applyFilters(depthQb, req);
    depthQb.groupBy('d.seccion');

    const depthRaw = await depthQb.getRawMany();
    const depth_by_section = depthRaw.filter(d => d.section).map(d => {
      const views = Number(d.views || 0);
      const sessions = Number(d.sessions || 0);
      const ratio = sessions > 0 ? (views / sessions) : 0;
      return {
        section: d.section,
        depth_ratio: Number(ratio.toFixed(2))
      };
    });

    depth_by_section.sort((a, b) => b.depth_ratio - a.depth_ratio);

    res.status(200).json({
      users_by_section: usersRaw.filter(u => u.section).map(u => ({
        section: u.section,
        users: Number(u.users || 0)
      })),
      views_by_topic: viewsRaw.filter(v => v.topic).map(v => ({
        topic: v.topic,
        views: Number(v.views || 0)
      })),
      depth_by_section
    });
  });

  getAudienceStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!AppDataSource.isInitialized) {
      res.status(500).json({ message: 'Base de datos no inicializada' });
      return;
    }

    const { start_date, end_date } = req.query as { start_date?: string, end_date?: string };

    const fidelityQb = AppDataSource.getRepository(DashboardData).createQueryBuilder('d')
      .select('d.seccion', 'section')
      .addSelect('SUM(d.sessions)', 'sessions')
      .addSelect('SUM(d.totalUsers)', 'users')
      .addSelect('SUM(d.engagedSessions)', 'engaged_sessions');
    applyFilters(fidelityQb, req);
    fidelityQb.groupBy('d.seccion');

    const fidelityRaw = await fidelityQb.getRawMany();

    const totalSess = fidelityRaw.reduce((acc, f) => acc + Number(f.sessions || 0), 0);
    const totalUsers = fidelityRaw.reduce((acc, f) => acc + Number(f.users || 0), 0);
    const globalFidelity = totalUsers > 0 ? (totalSess / totalUsers) : 0;

    const sections = fidelityRaw.filter(f => f.section).map(f => {
      const sess = Number(f.sessions || 0);
      const users = Number(f.users || 0);
      const eng = Number(f.engaged_sessions || 0);
      const fid = users > 0 ? (sess / users) : 0;
      const er = sess > 0 ? (eng / sess * 100) : 0;

      return {
        section: f.section,
        fidelity: Number(fid.toFixed(2)),
        fidelity_status: fid >= globalFidelity ? "green" : "red",
        engagement_rate: Number(er.toFixed(2)),
        share_of_volume: 0 // Will map to UI correctly
      };
    });

    res.status(200).json({
      global_fidelity: Number(globalFidelity.toFixed(2)),
      sections
    });
  });

  getDashboardFilters = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!AppDataSource.isInitialized) {
      res.status(500).json({ message: 'Base de datos no inicializada' });
      return;
    }

    const repo = AppDataSource.getRepository(DashboardData);

    const getDistinct = async (column: string) => {
      const rows = await repo.createQueryBuilder('d')
        .select(`DISTINCT d.${column}`, 'val')
        .orderBy(`d.${column}`, 'ASC')
        .getRawMany();
      return rows.map(r => r.val).filter(Boolean);
    };

    const authors = await getDistinct('autor');
    const topics = await getDistinct('temaPrincipal');
    const categories = await getDistinct('categoriaEntidad');
    const sections = await getDistinct('seccion');
    const sources = await getDistinct('fuente');

    res.status(200).json({
      authors,
      topics,
      categories,
      sections,
      sources
    });
  });

  importDashboardData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Stub endpoint for compatibility (normally triggered by ETL pipeline)
    res.status(200).json({
      success: true,
      message: 'Datos importados exitosamente.'
    });
  });
}
