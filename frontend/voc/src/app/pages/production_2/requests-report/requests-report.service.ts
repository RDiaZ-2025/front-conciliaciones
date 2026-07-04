import { BaseApiService } from '../../../services/base-api.service';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DashboardStats {
  total: number;
  active: number;
  completed: number;
  atRisk: number;
  overdue: number;
  cancelled: number;
  workload: {
    userName: string;
    userAvatar?: string;
    count: number;
    percentage: number;
    status: 'normal' | 'overloaded' | 'underutilized';
  }[];
  executionStatus: {
    inProgress: number;
    completed: number;
    pending: number;
    cancelled: number;
  };
  recentTasks: {
    task: string;
    responsible: string;
    account: string;
    status: string;
    deadline: string;
    avatar?: string;
  }[];
  stages: {
    id: string;
    label: string;
    count: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class RequestsReportService extends BaseApiService {
  private apiUrl = `${environment.apiUrl}/production/dashboard-stats`;

  getDashboardStats(): Observable<{ success: boolean; data: DashboardStats }> {
    return this.http.get<{ success: boolean; data: DashboardStats }>(this.apiUrl);
  }
}
