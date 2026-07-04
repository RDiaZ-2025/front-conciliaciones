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

  getMenuItems(): Observable<{ data: MenuItem[] }> {
    return this.http.get<{ data: MenuItem[] }>(this.apiUrl);
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
