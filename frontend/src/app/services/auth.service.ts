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
                        name: rawData.name,
                        email: rawData.email,
                        permissions: permissions,
                        teams: rawData.teams || []
                     };
                     this.currentUser.set(normalizedUser);
                } else {
                    this.logout();
                }
            },
            error: () => this.logout()
        });
    }
  }

  login(credentials: {email: string, password: string}): Observable<LoginResponse> {
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
                teams: rawUser.teams || []
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
