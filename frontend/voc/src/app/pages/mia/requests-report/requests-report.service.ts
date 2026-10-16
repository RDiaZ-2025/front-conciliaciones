import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApiService } from '../../../services/base-api.service';
import { environment } from '../../../../environments/environment';

export type RequestBusinessStatus = 'in_progress' | 'returned' | 'completed' | 'deleted';

export interface RequestsAnalyticsFilters {
  dateFrom: Date;
  dateTo: Date;
  formIds: number[];
  workflowIds: number[];
}

export interface RequestsAnalytics {
  scope: { all: boolean; teamNames: string[] };
  filterOptions: {
    forms: { id: number; name: string }[];
    areas: { id: number; name: string }[];
  };
  summary: {
    total: number;
    inProgress: number;
    returned: number;
    completed: number;
    deleted: number;
    completionRate: number | null;
    returnRate: number | null;
    avgCycleDays: number | null;
    pendingTasks: number;
    avgPendingAgeDays: number | null;
    oldestPendingDays: number | null;
  };
  trend: { granularity: 'day' | 'month'; labels: string[]; created: number[]; completed: number[] };
  byForm: { label: string; count: number }[];
  byArea: { area: string; inProgress: number; returned: number; completed: number; total: number }[];
  topRequesters: { name: string; created: number; completed: number; inProgress: number }[];
  stageTimes: { stage: string; avgHours: number; count: number }[];
  workload: { userName: string; teamName: string; pending: number; avgAgeDays: number | null; maxAgeDays: number }[];
  pendingByStage: { stage: string; pending: number; avgAgeDays: number | null }[];
  pendingTasks: {
    submissionId: number;
    consecutive: string | null;
    formName: string;
    area: string;
    stageName: string;
    assigneeName: string;
    teamName: string;
    createdAt: string;
    ageDays: number;
  }[];
  requests: {
    id: number;
    consecutive: string | null;
    formName: string;
    requesterName: string;
    createdAt: string;
    status: RequestBusinessStatus;
    completedAt: string | null;
    cycleDays: number | null;
    ageDays: number | null;
    areas: { id: number; name: string; status: RequestBusinessStatus }[];
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class RequestsReportService extends BaseApiService {
  private apiUrl = `${environment.apiUrl}/production/requests-analytics`;

  getAnalytics(filters: RequestsAnalyticsFilters): Observable<{ success: boolean; data: RequestsAnalytics }> {
    let params = new HttpParams()
      .set('dateFrom', filters.dateFrom.toISOString())
      .set('dateTo', filters.dateTo.toISOString())
      .set('tz', String(new Date().getTimezoneOffset()));
    if (filters.formIds.length > 0) params = params.set('formIds', filters.formIds.join(','));
    if (filters.workflowIds.length > 0) params = params.set('workflowIds', filters.workflowIds.join(','));
    return this.http.get<{ success: boolean; data: RequestsAnalytics }>(this.apiUrl, { params });
  }
}
