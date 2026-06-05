import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { map, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state): boolean | Observable<boolean> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const userService = inject(UserService);

  // Verificamos si está logueado
  if (authService.isLoggedIn()) {
    
    // Verificar si la ruta es EXCLUSIVA de administrador
    const requireAdmin = route.data?.['requireAdmin'];
    if (requireAdmin && !authService.isAdmin()) {
      router.navigate([authService.getDefaultRoute()]);
      return false;
    }

    // Verificar permisos normales si la ruta lo requiere
    const requiredPermission = route.data?.['permission'];

    if (requiredPermission && !authService.hasPermission(requiredPermission)) {
      // En lugar de alert, redirigir suavemente a su página por defecto
      router.navigate([authService.getDefaultRoute()]);
      return false;
    }

    // Si tiene permiso a nivel de JWT, validamos el estado GLOBAL del módulo (mantenimiento/deshabilitado)
    if (requiredPermission) {
      return userService.getSystemModules().pipe(
        map(modules => {
          let targetSubmodule: any = null;
          for (const mod of modules) {
            const found = mod.submodules.find((s: any) => s.code === requiredPermission);
            if (found) {
              targetSubmodule = found;
              break;
            }
          }

          if (targetSubmodule) {
            if (targetSubmodule.is_disabled) {
              router.navigate([authService.getDefaultRoute()]);
              return false;
            }
            if (targetSubmodule.is_under_maintenance && !authService.isAdmin()) {
              alert(targetSubmodule.maintenance_message || 'Este módulo se encuentra en mantenimiento.');
              router.navigate([authService.getDefaultRoute()]);
              return false;
            }
          }
          return true;
        }),
        catchError(err => {
          console.error("Error validando estado del módulo:", err);
          // Si falla la API de validación, cerramos sesión para evitar bucles infinitos
          authService.logout();
          return of(false);
        })
      );
    }

    return true; // ✅ Tiene token y permisos (si aplica)
  } else {
    router.navigate(['/login']); // ⛔ No tiene token, lo mandamos al login
    return false;
  }
};