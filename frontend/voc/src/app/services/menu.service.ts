import { BaseApiService } from './base-api.service';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MenuItem {
  id: number;
  label: string;
  icon?: string;
  route?: string;
  parentId?: number;
  displayOrder: number;
  isActive: boolean;
  project: string;
  children?: MenuItem[];
  permissionName?: string;
  permissionId?: number;
}

export interface MenuApiResponse {
  success: boolean;
  data: MenuItem[];
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MenuService extends BaseApiService {
  private baseUrl = `${environment.apiUrl}/menus`;

  getAllMenuItems(project?: string): Observable<MenuApiResponse> {
    const url = project ? `${this.baseUrl}?project=${project}` : this.baseUrl;
    return this.http.get<MenuApiResponse>(url);
  }

  getMenuItemsByPermissions(permissions: string[], project?: string): Observable<MenuApiResponse> {
    return this.http.post<MenuApiResponse>(`${this.baseUrl}/by-permissions`, { permissions, project });
  }

  createMenuItem(menuItem: Partial<MenuItem>): Observable<{ success: boolean; data: { id: number }; message?: string }> {
    return this.http.post<{ success: boolean; data: { id: number }; message?: string }>(this.baseUrl, menuItem);
  }

  updateMenuItem(id: number, menuItem: Partial<MenuItem>): Observable<{ success: boolean; message?: string }> {
    return this.http.put<{ success: boolean; message?: string }>(`${this.baseUrl}/${id}`, menuItem);
  }

  deleteMenuItem(id: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.baseUrl}/${id}`);
  }
}
