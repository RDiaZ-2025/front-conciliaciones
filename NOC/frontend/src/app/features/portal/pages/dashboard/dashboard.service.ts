import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DASHBOARD_CONFIG } from './dashboard.constants';

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
export class DashboardService {
    private apiUrl = DASHBOARD_CONFIG.apiUrl;

    constructor(private http: HttpClient) { }

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
        return this.http.get<DashboardFilters>(`${this.apiUrl}/dashboard/filters`);
    }

    getOverview(filters: any): Observable<OverviewStats> {
        return this.http.get<OverviewStats>(`${this.apiUrl}/dashboard/overview`, { params: this.getHttpParams(filters) });
    }

    getContent(filters: any): Observable<ContentStats> {
        return this.http.get<ContentStats>(`${this.apiUrl}/dashboard/content`, { params: this.getHttpParams(filters) });
    }

    getEntities(filters: any): Observable<EntityStats> {
        return this.http.get<EntityStats>(`${this.apiUrl}/dashboard/entities`, { params: this.getHttpParams(filters) });
    }

    getEntityDetail(entity: string, filters: any): Observable<EntityDetail> {
        let params = this.getHttpParams(filters);
        params = params.set('entity', entity);
        return this.http.get<EntityDetail>(`${this.apiUrl}/dashboard/entities/detail`, { params });
    }

    getReach(filters: any): Observable<ReachStats> {
        return this.http.get<ReachStats>(`${this.apiUrl}/dashboard/reach`, { params: this.getHttpParams(filters) });
    }

    getAudience(filters: any): Observable<AudienceStats> {
        return this.http.get<AudienceStats>(`${this.apiUrl}/dashboard/audience`, { params: this.getHttpParams(filters) });
    }

    importData(): Observable<any> {
        return this.http.post(`${this.apiUrl}/dashboard/import`, {});
    }
}
