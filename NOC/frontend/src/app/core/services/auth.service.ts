import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators'; // Para hacer cosas secundarias como guardar el token
import { Router } from '@angular/router';
import { SYSTEM_MODULES } from '../config/modules.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000'; // Tu backend

  constructor(private http: HttpClient, private router: Router) { } // Inject Router

  login(credentials: { username: string, password: string }): Observable<any> {
    // TRUCO: FastAPI espera datos de formulario, no JSON.
    // Usamos HttpParams para crear el formato correcto.
    const payload = new HttpParams()
      .set('username', credentials.username) // FastAPI siempre busca un campo llamado 'username'
      .set('password', credentials.password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post(`${this.apiUrl}/token`, payload.toString(), { headers })
      .pipe(
        tap((response: any) => {
          // Si el login es exitoso, guardamos el token en el navegador
          if (response.access_token) {
            sessionStorage.setItem('token', response.access_token);
          }
        })
      );
  }

  // Método útil para cerrar sesión
  logout() {
    sessionStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  // Verificar si estoy logueado
  isLoggedIn(): boolean {
    return !!sessionStorage.getItem('token');
  }

  // Verificar si es administrador puro
  isAdmin(): boolean {
    const token = sessionStorage.getItem('token');
    if (!token) return false;
    const decoded = this.decodeToken(token);
    return decoded?.role?.toLowerCase() === 'admin';
  }

  // Decodificar token manualmente para evitar instalar librerías extra
  private decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Error decodificando token', e);
      return null;
    }
  }

  getPermissions(): string[] {
    const token = sessionStorage.getItem('token');
    if (!token) return [];

    const decoded = this.decodeToken(token);
    // El backend envía 'permissions' como string "modulo1,modulo2"
    if (decoded && decoded.permissions) {
      return decoded.permissions.split(',');
    }
    return [];
  }

  hasPermission(requiredModule: string): boolean {
    // Admin siempre tiene acceso a todo (opcional, pero buena práctica)
    const token = sessionStorage.getItem('token');
    if (token) {
      const decoded = this.decodeToken(token);
      if (decoded?.role?.toLowerCase() === 'admin') return true;
    }

    const perms = this.getPermissions();
    return perms.map(p => p.trim()).includes(requiredModule);
  }

  getUserName(): string {
    const token = sessionStorage.getItem('token');
    if (!token) return 'Usuario';

    const decoded = this.decodeToken(token);
    // Intentamos buscar varias propiedades comunes
    return decoded?.fullName || decoded?.name || decoded?.sub || decoded?.username || 'Usuario';
  }

  // NUEVO: Obtener la primera ruta disponible según permisos
  getDefaultRoute(): string {
    if (!this.isLoggedIn()) return '/login';

    // 1. Si es admin, puede entrar al dashboard por defecto
    const token = sessionStorage.getItem('token');
    if (token) {
      const decoded = this.decodeToken(token);
      if (decoded?.role?.toLowerCase() === 'admin') return '/portal/dashboard';
    }

    // 2. Si no es admin, buscar el primero que tenga permitido
    for (const module of SYSTEM_MODULES) {
      // EVITAR BUCLE INFINITO: Si el módulo es solo para admins, saltarlo
      if (module.adminOnly && !this.isAdmin()) continue;
      
      for (const sub of module.submodules) {
        if (this.hasPermission(sub.code)) {
          return sub.route;
        }
      }
    }

    // 3. Fallback final
    return '/login';
  }
}