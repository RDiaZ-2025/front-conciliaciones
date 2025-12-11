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
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent)
      },
      {
        path: 'admin',
        loadComponent: () => import('./pages/admin/admin').then(m => m.AdminComponent)
      },
      {
        path: 'production',
        loadComponent: () => import('./pages/production/production').then(m => m.ProductionComponent)
      },
      {
        path: 'upload',
        loadComponent: () => import('./pages/upload/upload').then(m => m.UploadComponent)
      },
      {
        path: 'load-documents',
        loadComponent: () => import('./pages/load-documents/load-documents').then(m => m.LoadDocumentsComponent)
      },
      {
        path: 'menus',
        loadComponent: () => import('./pages/menus/menus').then(m => m.MenusComponent)
      },
      {
        path: 'portada',
        redirectTo: 'cover15minutes',
        pathMatch: 'full'
      },
      {
        path: 'cover15minutes',
        loadComponent: () => import('./pages/cover15minutes/cover15minutes').then(m => m.Cover15MinutesComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent)
      },
    ]
  },

  { path: '**', redirectTo: 'login' }
];
