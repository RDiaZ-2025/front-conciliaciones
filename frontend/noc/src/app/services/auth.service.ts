import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of, catchError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { SYSTEM_MODULES } from '../constants/modules.config';

export interface User {
  id: number;
  name: string;
  email: string;
  permissions: string[];
  role?: string;
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
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/auth`;

  currentUser = signal<User | null>(null);

  constructor() {
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

            const normalizedUser: User = {
              id: rawData.id,
              name: rawData.name || rawData.fullName || rawData.username || 'Usuario',
              email: rawData.email,
              permissions: permissions,
              role: rawData.role || 'user'
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
              name: rawUser.name || rawUser.fullName || rawUser.username || 'Usuario',
              email: rawUser.email,
              permissions: permissions,
              role: rawUser.role || 'user'
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

  isLoggedIn(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  isAdmin(): boolean {
    const user = this.currentUser();
    return user?.role?.toLowerCase() === 'admin' || user?.permissions?.includes('admin_panel') || false;
  }

  getPermissions(): string[] {
    const user = this.currentUser();
    return user?.permissions || [];
  }

  hasPermission(requiredModule: string): boolean {
    if (this.isAdmin()) return true;
    const perms = this.getPermissions();
    return perms.includes(requiredModule.toLowerCase());
  }

  getUserName(): string {
    const user = this.currentUser();
    return user?.name || 'Usuario';
  }

  verifyToken(): Observable<any> {
    return this.http.get(`${this.apiUrl}/verify`).pipe(
      catchError(() => {
        return of(null);
      })
    );
  }

  getDefaultRoute(): string {
    if (!this.isLoggedIn()) return '/login';

    if (this.isAdmin()) return '/portal/dashboard';

    for (const module of SYSTEM_MODULES) {
      if (module.adminOnly && !this.isAdmin()) continue;
      
      for (const sub of module.submodules) {
        if (this.hasPermission(sub.code)) {
          return sub.route;
        }
      }
    }

    return '/login';
  }
}