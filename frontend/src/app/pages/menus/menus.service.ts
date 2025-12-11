import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MenuItem, MenuFormData } from './menus.models';

@Injectable({
  providedIn: 'root'
})
export class MenusService {
  private http = inject(HttpClient);
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
