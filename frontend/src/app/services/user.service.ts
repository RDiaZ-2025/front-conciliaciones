import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  user?: T;
  message?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  permissions: string[];
  status: number;
}

export interface Permission {
  id: number;
  name: string;
  description: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password?: string;
  permissions: string[];
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  permissions?: string[];
}

export interface AccessHistoryRecord {
  email: string;
  loginTime: string;
  ip?: string;
  success?: boolean;
  source: 'backend' | 'frontend';
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  getAllUsers(): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(this.apiUrl).pipe(
      map(response => response.data || [])
    );
  }

  getAllPermissions(): Observable<Permission[]> {
    return this.http.get<ApiResponse<Permission[]>>(`${this.apiUrl}/permissions/all`).pipe(
      map(response => response.data || [])
    );
  }

  createUser(user: CreateUserDto): Observable<User> {
    return this.http.post<ApiResponse<User>>(this.apiUrl, user).pipe(
      map(response => response.user || response.data!)
    );
  }

  updateUser(id: number, updates: UpdateUserDto): Observable<User> {
    return this.http.put<ApiResponse<User>>(`${this.apiUrl}/${id}`, updates).pipe(
      map(response => response.user || response.data!)
    );
  }

  toggleUserStatus(id: number): Observable<{ newStatus: number }> {
    return this.http.put<{ newStatus: number }>(`${this.apiUrl}/${id}/toggle-status`, {});
  }

  updateUserPermissions(id: number, permissions: string[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/permissions`, { permissions });
  }
}
