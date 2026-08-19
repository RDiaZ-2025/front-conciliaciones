import { BaseApiService } from '../../services/base-api.service';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MenuItem } from '../../models/common/menu-item';
import { MenuFormData } from '../../models/common/menu-form-data';

@Injectable({
  providedIn: 'root'
})
export class MenusService extends BaseApiService {
  private apiUrl = `${environment.apiUrl}/menus`;

  getMenuItems(project?: string): Observable<{ data: MenuItem[] }> {
    const url = project ? `${this.apiUrl}?project=${project}` : this.apiUrl;
    return this.http.get<{ data: MenuItem[] }>(url);
  }

  createMenuItem(data: MenuFormData): Observable<MenuItem> {
    return this.http.post<MenuItem>(this.apiUrl, data);
  }

  updateMenuItem(id: number, data: MenuFormData): Observable<MenuItem> {
    return this.http.put<MenuItem>(`${this.apiUrl}/${id}`, data);
  }

  deleteMenuItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
