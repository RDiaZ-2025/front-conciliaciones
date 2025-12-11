import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
    return this.http.get<User[]>(this.apiUrl);
  }

  getAllPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.apiUrl}/permissions/all`);
  }

  createUser(user: CreateUserDto): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }

  updateUser(id: number, updates: UpdateUserDto): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, updates);
  }

  toggleUserStatus(id: number): Observable<{ newStatus: number }> {
    return this.http.put<{ newStatus: number }>(`${this.apiUrl}/${id}/toggle-status`, {});
  }

  updateUserPermissions(id: number, permissions: string[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/permissions`, { permissions });
  }
}
