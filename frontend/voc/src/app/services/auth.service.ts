import { BaseApiService } from './base-api.service';
import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, of, catchError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  name: string;
  email: string;
  permissions: string[];
  teams?: string[];
  teamId?: number;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: any;
  message?: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService extends BaseApiService {
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/auth`;

  currentUser = signal<User | null>(null);

  constructor() {
    super();
    this.initializeAuth();
  }

  private normalizePermissions(perms: string[]): string[] {
    return perms.map(p => p.toLowerCase());
  }

  private initializeAuth() {
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user');

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        this.currentUser.set(parsedUser);
      } catch (e) {
        console.error('Error parsing stored user', e);
      }
    }

    if (token) {
      this.verifyToken().subscribe({
        next: (userData) => {
          if (userData) {
            const rawData = userData.data || userData;
            const permissions = rawData.permissions
              ? this.normalizePermissions(rawData.permissions)
              : (userData.permissions ? this.normalizePermissions(userData.permissions) : []);

            // Try to preserve teamId from localStorage if backend doesn't send it in verify
            let teamId = rawData.teamId;
            if (teamId == null && storedUser) {
              try {
                const parsedUser = JSON.parse(storedUser);
                teamId = parsedUser.teamId;
              } catch (e) { }
            }

            const normalizedUser: User = {
              id: rawData.id,
              name: rawData.name,
              email: rawData.email,
              permissions: permissions,
              teams: rawData.teams || [],
              teamId: teamId
            };
            this.currentUser.set(normalizedUser);
            localStorage.setItem('user', JSON.stringify(normalizedUser));
          } else {
            this.logout();
          }
        },
        error: () => this.logout()
      });
    }
  }

  login(credentials: { email: string, password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response.success) {
          const rawUser = response.user || response.data;

          if (response.token) {
            localStorage.setItem('auth_token', response.token);
          }

          if (rawUser) {
            const permissions = rawUser.permissions ? this.normalizePermissions(rawUser.permissions) : [];
            const userData: User = {
              id: rawUser.id,
              name: rawUser.name,
              email: rawUser.email,
              permissions: permissions,
              teams: rawUser.teams || [],
              teamId: rawUser.teamId
            };

            localStorage.setItem('user', JSON.stringify(userData));
            this.currentUser.set(userData);
          }
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  verifyToken(): Observable<any> {
    return this.http.get(`${this.apiUrl}/verify`).pipe(
      catchError(() => {
        return of(null);
      })
    );
  }

  hasPermission(permission: string): boolean {
    const user = this.currentUser();
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission.toLowerCase());
  }
}
