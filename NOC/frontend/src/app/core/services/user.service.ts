import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { User } from '../models/user.model';
import { SYSTEM_MODULES } from '../config/modules.config';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8000/users';

  constructor(private http: HttpClient) { }

  // 1. Obtener todos los usuarios
  getUsers(): Observable<User[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(users => users.map(u => this.adaptUser(u)))
    );
  }

  // Caché de módulos para no saturar el backend
  private cachedModules: any[] | null = null;

  // 1.5 Obtener módulos dinámicos del sistema
  getSystemModules(forceRefresh = false): Observable<any[]> {
    if (this.cachedModules && !forceRefresh) {
      return new Observable<any[]>(observer => {
        observer.next(this.cachedModules!);
        observer.complete();
      });
    }
    return this.http.get<any[]>('http://localhost:8000/system-modules').pipe(
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
      tap(modules => this.cachedModules = modules)
    );
  }

  // 1.6 Actualizar estado de submódulo (Mantenimiento / Deshabilitado)
  updateModuleState(code: string, state: any): Observable<any> {
    return this.http.put<any>(`http://localhost:8000/system-modules/${code}/state`, state);
  }

  // 2. Crear un usuario nuevo
  createUser(user: User): Observable<User> {
    const payload = {
      username: user.username,
      email: user.email,
      password: user.password,
      role: user.role,
      modules: user.modules,
      full_name: user.fullName,
      is_active: user.enabled
    };

    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(u => this.adaptUser(u))
    );
  }

  // 3. Eliminar un usuario por su ID
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(this.apiUrl + '/' + id);
  }

  // 4. Actualizar usuario existente
  updateUser(user: User): Observable<User> {
    const payload = {
      username: user.username,
      email: user.email,
      password: user.password,
      role: user.role,
      modules: user.modules,
      full_name: user.fullName,
      is_active: user.enabled
    };
    return this.http.put<any>(this.apiUrl + '/' + user.id, payload).pipe(
      map(u => this.adaptUser(u))
    );
  }

  // Adaptador: Backend (snake_case) -> Frontend (camelCase)
  private adaptUser(backendUser: any): User {
    return {
      id: backendUser.id,
      username: backendUser.username,
      email: backendUser.email,
      fullName: backendUser.full_name, // Map snake_case to camelCase
      role: backendUser.role,
      enabled: backendUser.is_active,  // Map is_active to enabled
      password: '', // No devolvemos password
      modules: backendUser.permissions ? backendUser.permissions.split(',') : [] // String to Array
    };
  }
}