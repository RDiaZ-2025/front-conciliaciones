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
  };
  recentTasks: {
    task: string;
    responsible: string;
    account: string;
    status: string;
    deadline: string;
    avatar?: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class RequestsReportService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/production/dashboard-stats`;

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(this.apiUrl);
  }
}
