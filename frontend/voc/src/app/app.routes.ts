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
        path: 'users',
        loadComponent: () => import('./pages/admin/admin').then(m => m.AdminComponent)
      },
      {
        path: 'mia',
        loadComponent: () => import('./pages/production/production').then(m => m.ProductionComponent)
      },
      {
        path: 'requests',
        loadComponent: () => import('./pages/production_2/production').then(m => m.ProductionComponent)
      },
      {
        path: 'requests-beta',
        loadComponent: () => import('./pages/production-beta/production-beta').then(m => m.ProductionBetaComponent),
        pathMatch: 'full'
      },
      {
        path: 'requests-beta/admin',
        loadComponent: () => import('./pages/requests-beta-admin/requests-beta-admin.component').then(m => m.RequestsBetaAdminComponent)
      },
      {
        path: 'requests-beta/inbox',
        loadComponent: () => import('./pages/requests-beta-inbox/requests-beta-inbox.component').then(m => m.RequestsBetaInboxComponent)
      },
      {
        path: 'campaign-scheduling',
        loadComponent: () => import('./pages/production/campaign-scheduling/campaign-scheduling.component').then(m => m.CampaignSchedulingComponent)
      },
      {
        path: 'campaign-scheduling_2',
        loadComponent: () => import('./pages/production_2/campaign-scheduling/campaign-scheduling.component').then(m => m.CampaignSchedulingComponent)
      },
      {
        path: 'requests-report',
        loadComponent: () => import('./pages/production/requests-report/requests-report.component').then(m => m.RequestsReportComponent)
      },
      {
        path: 'requests-report_2',
        loadComponent: () => import('./pages/production_2/requests-report/requests-report.component').then(m => m.RequestsReportComponent)
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
        path: 'historical-oc',
        loadComponent: () => import('./pages/historical-oc/historical-oc.component').then(m => m.HistoricalOcComponent)
      },
      {
        path: 'menus',
        loadComponent: () => import('./pages/menus/menus').then(m => m.MenusComponent)
      },
      {
        path: 'permissions',
        loadComponent: () => import('./pages/permissions/permissions.component').then(m => m.PermissionsComponent)
      },
      {
        path: 'teams',
        loadComponent: () => import('./pages/teams/teams').then(m => m.TeamsComponent)
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
      {
        path: 'commercial/onboarding',
        loadComponent: () => import('./pages/commercial/commercial.component').then(m => m.CommercialComponent)
      },
    ]
  },

  { path: '**', redirectTo: 'login' }
];
