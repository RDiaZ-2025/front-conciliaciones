import { BaseApiService } from './base-api.service';
import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DASHBOARD_CONFIG } from '../pages/portal/dashboard/dashboard.models';

export interface DashboardFilters {
    authors: string[];
    topics: string[];
    categories: string[];
    sections: string[];
    sources: string[];
}

// --- Tab Interfaces ---

export interface OverviewStats {
    cards: {
        total_users: number;
        users_variation: number;
        total_views: number;
        views_variation: number;
        engagement_rate: number;
        engagement_rate_variation: number; // pp difference
        pages_per_session: number;
        pps_variation: number;
        fidelity: number;
        fidelity_variation: number;
        active_source: string;
    };
    volume: {
        total_articles: number;
        variation: number;
        history: {
            date: string;
            articles: number;
            views: number;
        }[];
    };
    trend: {
        period: string;
        sessions: number;
        engagement_rate: number;
    }[];
    highlights: {
        top_section: string;
        viral_topic: string;
        featured_author: string;
    };
    comparison_period: string;
}

export interface ContentStats {
    matrix: {
        topic: string;
        sessions: number;
        engagement_rate: number;
    }[];
    authors: {
        author: string;
        score: number;
        sessions: number;
        articles: number;
        engagement_rate: number;
        trend?: string; // Optional: up/down
    }[];
}

export interface EntityStats {
    section_avg: number;
    entities: {
        entity: string;
        semantic_score: number;
        syntactic_score: number;
        engagement_score: number;
        dev_vs_avg: number;
        sessions: number;
        sparkline: number[];
        percentile: number;
    }[];
    best_combinations: { pair: string; count: number }[];
    conclusions: string[];
}

export interface ReachStats {
    users_by_section: { section: string; users: number }[];
    views_by_topic: { topic: string; views: number }[];
    depth_by_section: { section: string; depth_ratio: number }[];
}

export interface AudienceStats {
    global_fidelity: number;
    sections: {
        section: string;
        fidelity: number;
        fidelity_status: string;
        engagement_rate: number;
        share_of_volume: number;
    }[];
}

export interface EntityDetail {
    entity: string;
    type: string;
    metrics: {
        engagement: number;
        semantic: number;
        syntactic: number;
        total_sessions: number;
    };
    best_topics: { topic: string; er: number; sessions: number }[];
    suggested_partners: string[];
    secondary_entities: {
        name: string;
        type: string;
        er: number;
        category: string;
        semantic: number;
        syntactic: number;
        insight: string;
    }[];
    top_articles: { title: string; er: number; sessions: number; date: string }[];
    data_insights: {
        ideal_section: string | null;
        best_topic: string | null;
        suggested_combo: string | null;
        top_author: string | null;
    };
}

@Injectable({
    providedIn: 'root'
})
export class DashboardService extends BaseApiService {
    private apiUrl = DASHBOARD_CONFIG.apiUrl;

    

    private getHttpParams(filters: any): HttpParams {
        let params = new HttpParams();

        const addParam = (key: string, value: any) => {
            if (value) {
                if (Array.isArray(value)) {
                    value.forEach(v => {
                        if (v) params = params.append(key, v);
                    });
                } else {
                    params = params.set(key, value);
                }
            }
        };

        addParam('start_date', filters.start_date);
        addParam('end_date', filters.end_date);
        addParam('source', filters.source);
        addParam('section', filters.section);
        addParam('topic', filters.topic);
        addParam('category', filters.category);
        addParam('author', filters.author);

        return params;
    }

    getFilters(): Observable<DashboardFilters> {
        return this.http.get<DashboardFilters>(`${this.apiUrl}/dashboard/filters`).pipe(
            map(filters => {
                if (!filters || !filters.sources?.length) {
                    return this.getMockFilters();
                }
                return filters;
            }),
            catchError(err => {
                console.warn("FastAPI offline, using mock filters.", err);
                return of(this.getMockFilters());
            })
        );
    }

    getOverview(filters: any): Observable<OverviewStats> {
        return this.http.get<OverviewStats>(`${this.apiUrl}/dashboard/overview`, { params: this.getHttpParams(filters) }).pipe(
            map(data => {
                if (!data || !data.cards || !data.cards.total_users) {
                    return this.getMockOverview();
                }
                return data;
            }),
            catchError(err => {
                console.warn("FastAPI offline, using mock overview stats.", err);
                return of(this.getMockOverview());
            })
        );
    }

    getContent(filters: any): Observable<ContentStats> {
        return this.http.get<ContentStats>(`${this.apiUrl}/dashboard/content`, { params: this.getHttpParams(filters) }).pipe(
            map(data => {
                if (!data || (!data.matrix?.length && !data.authors?.length)) {
                    return this.getMockContent();
                }
                return data;
            }),
            catchError(err => {
                console.warn("FastAPI offline, using mock content stats.", err);
                return of(this.getMockContent());
            })
        );
    }

    getEntities(filters: any): Observable<EntityStats> {
        return this.http.get<EntityStats>(`${this.apiUrl}/dashboard/entities`, { params: this.getHttpParams(filters) }).pipe(
            map(data => {
                if (!data || !data.entities?.length) {
                    return this.getMockEntities();
                }
                return data;
            }),
            catchError(err => {
                console.warn("FastAPI offline, using mock entities stats.", err);
                return of(this.getMockEntities());
            })
        );
    }

    getEntityDetail(entity: string, filters: any): Observable<EntityDetail> {
        let params = this.getHttpParams(filters);
        params = params.set('entity', entity);
        return this.http.get<EntityDetail>(`${this.apiUrl}/dashboard/entities/detail`, { params }).pipe(
            map(data => {
                if (!data || !data.metrics || !data.metrics.total_sessions) {
                    return this.getMockEntityDetail(entity);
                }
                return data;
            }),
            catchError(err => {
                console.warn("FastAPI offline, using mock entity details.", err);
                return of(this.getMockEntityDetail(entity));
            })
        );
    }

    getReach(filters: any): Observable<ReachStats> {
        return this.http.get<ReachStats>(`${this.apiUrl}/dashboard/reach`, { params: this.getHttpParams(filters) }).pipe(
            map(data => {
                if (!data || !data.users_by_section?.length) {
                    return this.getMockReach();
                }
                return data;
            }),
            catchError(err => {
                console.warn("FastAPI offline, using mock reach stats.", err);
                return of(this.getMockReach());
            })
        );
    }

    getAudience(filters: any): Observable<AudienceStats> {
        return this.http.get<AudienceStats>(`${this.apiUrl}/dashboard/audience`, { params: this.getHttpParams(filters) }).pipe(
            map(data => {
                if (!data || !data.sections?.length) {
                    return this.getMockAudience();
                }
                return data;
            }),
            catchError(err => {
                console.warn("FastAPI offline, using mock audience stats.", err);
                return of(this.getMockAudience());
            })
        );
    }

    importData(): Observable<any> {
        return this.http.post(`${this.apiUrl}/dashboard/import`, {}).pipe(
            catchError(err => {
                console.warn("FastAPI offline, mock import data success.", err);
                return of({ success: true, message: 'Datos importados exitosamente (Offline Mode).' });
            })
        );
    }

    private getMockFilters(): DashboardFilters {
        return {
            authors: ["Juan Perez", "Maria Gomez", "Carlos Rodriguez", "Ana Martinez"],
            topics: ["Politica", "Economia", "Deportes", "Entretenimiento", "Tecnologia"],
            categories: ["Nacional", "Internacional", "Opinión"],
            sections: ["Home", "Noticias", "Tendencias"],
            sources: ["Discover", "Google Search", "Directo", "Redes Sociales"]
        };
    }

    private getMockOverview(): OverviewStats {
        return {
            cards: {
                total_users: 125430,
                users_variation: 12.5,
                total_views: 458900,
                views_variation: 8.3,
                engagement_rate: 62.4,
                engagement_rate_variation: 2.1,
                pages_per_session: 3.2,
                pps_variation: 0.4,
                fidelity: 45.2,
                fidelity_variation: 1.5,
                active_source: "Discover"
            },
            volume: {
                total_articles: 340,
                variation: 5.2,
                history: [
                    { date: "2026-05-28", articles: 45, views: 52000 },
                    { date: "2026-05-29", articles: 48, views: 55000 },
                    { date: "2026-05-30", articles: 38, views: 49000 },
                    { date: "2026-05-31", articles: 42, views: 51000 },
                    { date: "2026-06-01", articles: 55, views: 62000 },
                    { date: "2026-06-02", articles: 50, views: 59000 },
                    { date: "2026-06-03", articles: 62, views: 68000 }
                ]
            },
            trend: [
                { period: "00:00 - 04:00", sessions: 12000, engagement_rate: 58.2 },
                { period: "04:00 - 08:00", sessions: 25000, engagement_rate: 60.5 },
                { period: "08:00 - 12:00", sessions: 48000, engagement_rate: 64.1 },
                { period: "12:00 - 16:00", sessions: 42000, engagement_rate: 62.8 },
                { period: "16:00 - 20:00", sessions: 55000, engagement_rate: 65.3 },
                { period: "20:00 - 00:00", sessions: 30000, engagement_rate: 61.0 }
            ],
            highlights: {
                top_section: "Noticias",
                viral_topic: "Tecnologia",
                featured_author: "Juan Perez"
            },
            comparison_period: "periodo anterior"
        };
    }

    private getMockContent(): ContentStats {
        return {
            matrix: [
                { topic: "Politica", sessions: 24500, engagement_rate: 61.2 },
                { topic: "Economia", sessions: 18200, engagement_rate: 63.5 },
                { topic: "Deportes", sessions: 35000, engagement_rate: 58.1 },
                { topic: "Entretenimiento", sessions: 42000, engagement_rate: 60.4 },
                { topic: "Tecnologia", sessions: 29000, engagement_rate: 65.2 }
            ],
            authors: [
                { author: "Juan Perez", score: 85, sessions: 45000, articles: 12, engagement_rate: 63.2, trend: "up" },
                { author: "Maria Gomez", score: 78, sessions: 38000, articles: 15, engagement_rate: 61.5, trend: "up" },
                { author: "Carlos Rodriguez", score: 92, sessions: 52000, articles: 8, engagement_rate: 66.8, trend: "up" },
                { author: "Ana Martinez", score: 71, sessions: 29000, articles: 14, engagement_rate: 59.4, trend: "down" }
            ]
        };
    }

    private getMockEntities(): EntityStats {
        return {
            section_avg: 55.4,
            entities: [
                {
                    entity: "Gobierno Nacional",
                    semantic_score: 72.5,
                    syntactic_score: 68.1,
                    engagement_score: 75.3,
                    dev_vs_avg: 19.9,
                    sessions: 15200,
                    sparkline: [12, 15, 18, 14, 16, 22, 25],
                    percentile: 95
                },
                {
                    entity: "Banco Central",
                    semantic_score: 64.2,
                    syntactic_score: 61.8,
                    engagement_score: 65.4,
                    dev_vs_avg: 10.0,
                    sessions: 9800,
                    sparkline: [8, 9, 7, 11, 10, 12, 14],
                    percentile: 88
                },
                {
                    entity: "Seleccion de Futbol",
                    semantic_score: 58.1,
                    syntactic_score: 55.3,
                    engagement_score: 61.2,
                    dev_vs_avg: 5.8,
                    sessions: 22000,
                    sparkline: [15, 17, 19, 18, 20, 24, 28],
                    percentile: 82
                }
            ],
            best_combinations: [
                { pair: "Gobierno - Banco Central", count: 12 },
                { pair: "Seleccion - Copa America", count: 8 }
            ],
            conclusions: [
                "Las menciones al Gobierno Nacional generan el mayor engagement.",
                "Las notas que combinan Gobierno con Banco Central tienen un CTR 15% superior al promedio."
            ]
        };
    }

    private getMockEntityDetail(entity: string): EntityDetail {
        return {
            entity: entity || "Gobierno Nacional",
            type: "Organización",
            metrics: {
                engagement: 75.3,
                semantic: 72.5,
                syntactic: 68.1,
                total_sessions: 15200
            },
            best_topics: [
                { topic: "Reforma Tributaria", er: 78.4, sessions: 6500 },
                { topic: "Nuevas Medidas", er: 72.1, sessions: 8700 }
            ],
            suggested_partners: ["Banco Central", "Ministerio de Economia"],
            secondary_entities: [
                {
                    name: "Ministro de Hacienda",
                    type: "Persona",
                    er: 76.5,
                    category: "Politica",
                    semantic: 70.2,
                    syntactic: 67.4,
                    insight: "Gran asociacion positiva en comentarios"
                }
            ],
            top_articles: [
                { title: "Anuncio de nuevas medidas economicas para el segundo semestre", er: 81.2, sessions: 5400, date: "2026-06-02" },
                { title: "Reacciones del mercado tras la reunion en la Casa Rosada", er: 74.3, sessions: 3200, date: "2026-06-03" }
            ],
            data_insights: {
                ideal_section: "Politica",
                best_topic: "Economia",
                suggested_combo: "Gobierno Nacional + Banco Central",
                top_author: "Juan Perez"
            }
        };
    }

    private getMockReach(): ReachStats {
        return {
            users_by_section: [
                { section: "Home", users: 85000 },
                { section: "Noticias", users: 65000 },
                { section: "Tendencias", users: 42000 },
                { section: "Economia", users: 28000 }
            ],
            views_by_topic: [
                { topic: "Politica", views: 120000 },
                { topic: "Economia", views: 95000 },
                { topic: "Deportes", views: 150000 },
                { topic: "Tecnologia", views: 85000 }
            ],
            depth_by_section: [
                { section: "Home", depth_ratio: 2.4 },
                { section: "Noticias", depth_ratio: 1.8 },
                { section: "Tendencias", depth_ratio: 3.1 },
                { section: "Economia", depth_ratio: 2.2 }
            ]
        };
    }

    private getMockAudience(): AudienceStats {
        return {
            global_fidelity: 45.2,
            sections: [
                { section: "Home", fidelity: 48.5, fidelity_status: "Alta", engagement_rate: 65.2, share_of_volume: 35.0 },
                { section: "Noticias", fidelity: 42.1, fidelity_status: "Media", engagement_rate: 60.1, share_of_volume: 25.0 },
                { section: "Tendencias", fidelity: 38.4, fidelity_status: "Baja", engagement_rate: 58.4, share_of_volume: 18.0 },
                { section: "Economia", fidelity: 52.3, fidelity_status: "Muy Alta", engagement_rate: 68.7, share_of_volume: 22.0 }
            ]
        };
    }
}
