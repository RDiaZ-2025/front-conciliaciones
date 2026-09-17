import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/login/login.component';
import { authGuard } from './guards/auth.guard';
import { AdminLayoutComponent } from './components/admin-layout/admin-layout.component';

export const routes: Routes = [

  { path: 'login', component: LoginComponent },

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

  {
    path: 'portal',
    loadChildren: () => import('./pages/portal/portal.module').then(m => m.PortalModule)
  },

  {
    path: 'news',
    loadChildren: () => import('./pages/noticias/noticias.module').then(m => m.NoticiasModule)
  },

  { path: '', redirectTo: '/login', pathMatch: 'full' },

  { path: '**', redirectTo: '/login' }
];
