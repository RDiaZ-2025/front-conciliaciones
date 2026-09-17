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

  if (authService.isLoggedIn()) {

    const requireAdmin = route.data?.['requireAdmin'];
    if (requireAdmin && !authService.isAdmin()) {
      router.navigate([authService.getDefaultRoute()]);
      return false;
    }

    const requiredPermission = route.data?.['permission'];

    if (requiredPermission && !authService.hasPermission(requiredPermission)) {

      router.navigate([authService.getDefaultRoute()]);
      return false;
    }

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
          console.warn("FastAPI backend offline or unreachable. Skipping module state validation.", err);

          return of(true);
        })
      );
    }

    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
};
