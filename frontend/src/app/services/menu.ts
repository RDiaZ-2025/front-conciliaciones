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
export class MenuService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/menus`;

  getAllMenuItems(): Observable<MenuApiResponse> {
    return this.http.get<MenuApiResponse>(this.baseUrl);
  }

  getMenuItemsByPermissions(permissions: string[]): Observable<MenuApiResponse> {
    return this.http.post<MenuApiResponse>(`${this.baseUrl}/by-permissions`, { permissions });
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
