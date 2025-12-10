import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { LayoutComponent } from './components/layout/layout';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, // Default to dashboard or upload
      {
        path: 'admin',
        loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent) // Placeholder
      },
      {
        path: 'production',
        loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent) // Placeholder
      },
      {
        path: 'upload',
        loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent) // Placeholder
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent) // Placeholder
      },
      // Add other routes here
    ]
  },

  { path: '**', redirectTo: 'login' }
];
