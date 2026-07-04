import { BaseApiService } from './base-api.service';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NewsSchedule {
  id: string;
  name: string;
  topic: string;
  userInstructions: string | null;
  sources: string[];
  url?: string;
  method?: string;
  startAt: string; // ISO string
  intervalMinutes: number; // Interval in minutes (e.g., 15, 30, 60, 1440)
  cronExpression?: string | null;
  scheduleConfig: any; // Flexible JSON config
  isActive: boolean;
  status?: string;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface WebhookPayload {
  sources: string[];
  topic: string;
  userInstructions: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class NewsSchedulerService extends BaseApiService {
  private apiUrl = `${environment.apiUrl}/noc/news-scheduler`;
  private webhookUrl = 'https://n8n.srv865978.hstgr.cloud/webhook/noc/generate-news';

  

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

  triggerNow(schedule: NewsSchedule): Observable<any> {
    const payload: WebhookPayload = {
      sources: schedule.sources && schedule.sources.length > 0 ? schedule.sources : [],
      topic: schedule.topic,
      userInstructions: schedule.userInstructions ? schedule.userInstructions : null
    };

    return this.http.post(this.webhookUrl, payload);
  }

  recordExecution(id: string): Observable<NewsSchedule> {
    return this.http.post<NewsSchedule>(`${this.apiUrl}/${id}/record-execution`, {});
  }
}
