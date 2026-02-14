import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.currentUser()) {
    return true;
  }

  // Check if token exists in localStorage as fallback (if signal not yet initialized)
  if (localStorage.getItem('auth_token')) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
