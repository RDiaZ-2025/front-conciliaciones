import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/login/login.component';
import { authGuard } from './guards/auth.guard';
import { AdminLayoutComponent } from './components/admin-layout/admin-layout.component';

export const routes: Routes = [
  // Ruta pública: Cualquiera puede ver el login
  { path: 'login', component: LoginComponent },

  // Ruta privada: Módulo Mensajería
  {
    path: 'messages',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('./pages/mensajeria/mensajeria.module').then(m => m.MensajeriaModule)
      }
    ]
  },

  // Ruta privada: Módulo Portal
  {
    path: 'portal',
    loadChildren: () => import('./pages/portal/portal.module').then(m => m.PortalModule)
  },

  // Ruta privada: Módulo Noticias
  {
    path: 'news',
    loadChildren: () => import('./pages/noticias/noticias.module').then(m => m.NoticiasModule)
  },

  // Si la ruta está vacía (ej. localhost:4200), ir al login
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Si escriben cualquier ruta desconocida, enviarlos al login
  { path: '**', redirectTo: '/login' }
];