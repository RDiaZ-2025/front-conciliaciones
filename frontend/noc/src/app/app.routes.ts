import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Ruta pública: Cualquiera puede ver el login
  { path: 'login', component: LoginComponent },

  // Ruta privada: Módulo de Administración
  {
    path: 'admin',
    // Lazy Loading: Solo descarga el código de Admin cuando el usuario entra aquí
    loadChildren: () => import('./pages/admin/admin.module').then(m => m.AdminModule),
    canActivate: [authGuard] // 🛡️ Aquí aplicamos el portero que creamos
  },

  // Ruta privada: Módulo Portal
  {
    path: 'portal',
    loadChildren: () => import('./pages/portal/portal.module').then(m => m.PortalModule)
  },

  // Ruta privada: Módulo Noticias
  {
    path: 'noticias',
    loadChildren: () => import('./pages/noticias/noticias.module').then(m => m.NoticiasModule)
  },

  // Si la ruta está vacía (ej. localhost:4200), ir al login
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Si escriben cualquier ruta desconocida, enviarlos al login
  { path: '**', redirectTo: '/login' }
];