import { BaseApiService } from './base-api.service';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NewsBlock {
  id: string;
  type: 'paragraph' | 'image' | 'heading';
  content?: string;
  url?: string;
  caption?: string;
  alt?: string;
  prompt?: string;
  level?: number;
  text?: string;
}

export interface NewsArticleData {
  title: string;
  subtitle: string;
  coverImage?: {
    url: string;
    alt: string;
    caption: string;
    prompt?: string;
  };
  blocks: NewsBlock[];
  tags?: string[];
  section?: string;
  author?: string;
  sourcesUsed?: any[];
}

export interface NewsDraftDetail {
  id: number;
  scheduleId: string;
  title: string;
  subtitle: string;
  path: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string | null;
  articleData: NewsArticleData;
}

export interface NewsSchedule {
  id: string;
  name: string;
  topic: string;
  userInstructions: string | null;
  sources: string[];
  url?: string;
  method?: string;
  startAt: string;
  intervalMinutes: number;
  cronExpression?: string | null;
  scheduleConfig: any;
  isActive: boolean;
  publishAutomatically?: boolean;
  pendingDraftsCount?: number;
  status?: string;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NewsSchedulerService extends BaseApiService {
  private apiUrl = `${environment.apiUrl}/noc/news-scheduler`;

  getSchedules(): Observable<NewsSchedule[]> {
    return this.http.get<NewsSchedule[]>(this.apiUrl);
  }

  getScheduleById(id: string): Observable<NewsSchedule> {
    return this.http.get<NewsSchedule>(`${this.apiUrl}/${id}`);
  }

  createSchedule(scheduleData: Omit<NewsSchedule, 'id' | 'createdAt'>): Observable<NewsSchedule> {
    return this.http.post<NewsSchedule>(this.apiUrl, scheduleData);
  }

  updateSchedule(id: string, updatedData: Partial<NewsSchedule>): Observable<NewsSchedule> {
    return this.http.put<NewsSchedule>(`${this.apiUrl}/${id}`, updatedData);
  }

  toggleActive(id: string): Observable<NewsSchedule> {
    return this.http.patch<NewsSchedule>(`${this.apiUrl}/${id}/toggle`, {});
  }

  deleteSchedule(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  triggerNow(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/run`, {});
  }

  recordExecution(id: string): Observable<NewsSchedule> {
    return this.http.post<NewsSchedule>(`${this.apiUrl}/${id}/record-execution`, {});
  }

  getPendingDrafts(scheduleId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${scheduleId}/drafts`);
  }

  getDraftDetail(draftId: number): Observable<NewsDraftDetail> {
    return this.http.get<NewsDraftDetail>(`${this.apiUrl}/drafts/detail/${draftId}`);
  }

  updateDraft(draftId: number, articleData: NewsArticleData): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/drafts/${draftId}`, articleData);
  }

  deleteDraft(draftId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/drafts/${draftId}`);
  }

  aiAdjustParagraph(draftId: number, blockId: string, currentText: string, instruction: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/drafts/${draftId}/ai-adjust-paragraph`, {
      blockId,
      currentText,
      instruction
    });
  }

  aiAdjustArticle(draftId: number, instruction: string, articleData: NewsArticleData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/drafts/${draftId}/ai-adjust-article`, {
      instruction,
      articleData
    });
  }

  aiRegenerateImage(draftId: number, blockId: string, currentUrl: string, prompt: string, instruction: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/drafts/${draftId}/ai-regenerate-image`, {
      blockId,
      currentUrl,
      prompt,
      instruction
    });
  }

  previewDraft(path: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/drafts/preview`, { path });
  }

  publishDraft(draftId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/drafts/${draftId}/publish`, {});
  }

  saveDraft(scheduleId: string, path: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/draft`, { scheduleId, path });
  }
}
