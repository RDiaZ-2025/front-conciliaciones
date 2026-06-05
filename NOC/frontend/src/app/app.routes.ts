import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/pages/login/login';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Ruta pública: Cualquiera puede ver el login
  { path: 'login', component: LoginComponent },

  // Ruta privada: Módulo de Administración
  {
    path: 'admin',
    // Lazy Loading: Solo descarga el código de Admin cuando el usuario entra aquí
    loadChildren: () => import('./features/admin/admin-module').then(m => m.AdminModule),
    canActivate: [authGuard] // 🛡️ Aquí aplicamos el portero que creamos
  },

  // Ruta privada: Módulo Portal
  {
    path: 'portal',
    loadChildren: () => import('./features/portal/portal-module').then(m => m.PortalModule)
  },

  // Si la ruta está vacía (ej. localhost:4200), ir al login
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Si escriben cualquier ruta desconocida, enviarlos al login
  { path: '**', redirectTo: '/login' }
];