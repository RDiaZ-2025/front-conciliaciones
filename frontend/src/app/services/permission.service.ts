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

  createPermission(permission: Partial<Permission>): Observable<{ success: boolean; data: Permission }> {
    return this.http.post<{ success: boolean; data: Permission }>(this.baseUrl, permission);
  }

  updatePermission(id: number, permission: Partial<Permission>): Observable<{ success: boolean; data: Permission }> {
    return this.http.put<{ success: boolean; data: Permission }>(`${this.baseUrl}/${id}`, permission);
  }

  deletePermission(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }
}
