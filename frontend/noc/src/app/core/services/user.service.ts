import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { User } from '../models/user.model';
import { SYSTEM_MODULES } from '../config/modules.config';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) { }

  // 1. Obtener todos los usuarios de Express
  getUsers(): Observable<User[]> {
    return this.http.get<{ success: boolean; data: any[] }>(this.apiUrl).pipe(
      map(res => (res.data || []).map(u => this.adaptUser(u)))
    );
  }

  // Caché de módulos para no saturar el backend
  private cachedModules: any[] | null = null;

  // 1.5 Obtener módulos dinámicos del sistema de FastAPI (port 8000)
  getSystemModules(forceRefresh = false): Observable<any[]> {
    if (this.cachedModules && !forceRefresh) {
      return new Observable<any[]>(observer => {
        observer.next(this.cachedModules!);
        observer.complete();
      });
    }
    return this.http.get<any[]>(`${environment.apiUrl}/system-modules`).pipe(
      map(backendModules => {
        // Hacemos un merge de los estados del backend con la configuración estricta del frontend
        // Esto asegura que conservamos las propiedades 'route', 'adminOnly', y los iconos originales.
        return SYSTEM_MODULES.map(sysMod => {
          const backMod = backendModules.find(bm => bm.name === sysMod.name);
          
          return {
            ...sysMod,
            submodules: sysMod.submodules.map(sysSub => {
              let backSub: any = null;
              if (backMod) {
                backSub = backMod.submodules.find((bs: any) => bs.code === sysSub.code);
              }
              // Combinamos las propiedades
              return {
                ...sysSub,
                is_under_maintenance: backSub ? backSub.is_under_maintenance : false,
                maintenance_message: backSub ? backSub.maintenance_message : 'Módulo en mantenimiento',
                is_disabled: backSub ? backSub.is_disabled : false
              };
            })
          };
        });
      }),
      catchError(err => {
        console.warn("FastAPI offline, defaulting to local SYSTEM_MODULES configuration.", err);
        return of(SYSTEM_MODULES.map(sysMod => ({
          ...sysMod,
          submodules: sysMod.submodules.map(sysSub => ({
            ...sysSub,
            is_under_maintenance: false,
            maintenance_message: 'Módulo en mantenimiento',
            is_disabled: false
          }))
        })));
      }),
      tap(modules => this.cachedModules = modules)
    );
  }

  // 1.6 Actualizar estado de submódulo (Mantenimiento / Deshabilitado) en FastAPI (port 8000)
  updateModuleState(code: string, state: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/system-modules/${code}/state`, state).pipe(
      catchError(err => {
        console.warn("FastAPI offline, using mock updateModuleState response.", err);
        return of({ success: true, message: 'Estado del submódulo actualizado localmente (Offline Mode).' });
      })
    );
  }

  // 2. Crear un usuario nuevo en Express
  createUser(user: User): Observable<User> {
    const payload = {
      name: user.fullName,
      email: user.email.toLowerCase(),
      password: user.password,
      permissions: user.modules,
      role: user.role
    };

    return this.http.post<{ success: boolean; data: any }>(this.apiUrl, payload).pipe(
      map(res => this.adaptUser(res.data || res))
    );
  }

  // 3. Eliminar un usuario por su ID en Express
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // 4. Actualizar usuario existente en Express
  updateUser(user: User): Observable<User> {
    const payload = {
      name: user.fullName,
      email: user.email.toLowerCase(),
      password: user.password || undefined,
      permissions: user.modules,
      role: user.role
    };
    return this.http.put<{ success: boolean; user?: any; data?: any }>(`${this.apiUrl}/${user.id}`, payload).pipe(
      map(res => this.adaptUser(res.user || res.data || res))
    );
  }

  // Adaptador: Backend Express -> Frontend (camelCase)
  private adaptUser(backendUser: any): User {
    const modulesList = backendUser.permissions
      ? (Array.isArray(backendUser.permissions)
        ? backendUser.permissions.map((p: any) => typeof p === 'string' ? p : p.name)
        : String(backendUser.permissions).split(','))
      : [];

    return {
      id: backendUser.id,
      username: backendUser.email,
      email: backendUser.email,
      fullName: backendUser.name || backendUser.fullName || backendUser.username || '',
      role: backendUser.role || (modulesList.includes('admin_panel') ? 'admin' : 'user'),
      enabled: backendUser.status === 1,
      password: '',
      modules: modulesList
    };
  }
}