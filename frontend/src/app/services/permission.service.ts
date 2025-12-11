import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Permission {
  id: number;
  name: string;
  description?: string;
}

export interface PermissionApiResponse {
  success: boolean;
  data: Permission[];
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/permissions`;

  getAllPermissions(): Observable<PermissionApiResponse> {
    return this.http.get<PermissionApiResponse>(this.baseUrl);
  }
}
