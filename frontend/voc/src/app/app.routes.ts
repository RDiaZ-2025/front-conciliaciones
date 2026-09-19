import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
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
        loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: 'mia',
        loadComponent: () => import('./pages/mia/mia.component').then(m => m.MiaComponent)
      },
      {
        path: 'requests',
        loadComponent: () => import('./pages/production_2/production.component').then(m => m.ProductionComponent)
      },
      {
        path: 'requests-beta',
        loadComponent: () => import('./pages/production-beta/production-beta.component').then(m => m.ProductionBetaComponent),
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
        loadComponent: () => import('./pages/mia/campaign-scheduling/campaign-scheduling.component').then(m => m.CampaignSchedulingComponent)
      },
      {
        path: 'campaign-scheduling_2',
        loadComponent: () => import('./pages/production_2/campaign-scheduling/campaign-scheduling.component').then(m => m.CampaignSchedulingComponent)
      },
      {
        path: 'requests-report',
        loadComponent: () => import('./pages/mia/requests-report/requests-report.component').then(m => m.RequestsReportComponent)
      },
      {
        path: 'requests-report_2',
        loadComponent: () => import('./pages/production_2/requests-report/requests-report.component').then(m => m.RequestsReportComponent)
      },
      {
        path: 'upload',
        loadComponent: () => import('./pages/upload/upload.component').then(m => m.UploadComponent)
      },
      {
        path: 'load-documents',
        loadComponent: () => import('./pages/load-documents/load-documents.component').then(m => m.LoadDocumentsComponent)
      },
      {
        path: 'historical-oc',
        loadComponent: () => import('./pages/historical-oc/historical-oc.component').then(m => m.HistoricalOcComponent)
      },
      {
        path: 'menus',
        loadComponent: () => import('./pages/menus/menus.component').then(m => m.MenusComponent)
      },
      {
        path: 'permissions',
        loadComponent: () => import('./pages/permissions/permissions.component').then(m => m.PermissionsComponent)
      },
      {
        path: 'teams',
        loadComponent: () => import('./pages/teams/teams.component').then(m => m.TeamsComponent)
      },
      {
        path: 'system-health',
        loadComponent: () => import('./pages/system-health/system-health.component').then(m => m.SystemHealthComponent)
      },
      {
        path: 'health',
        redirectTo: 'system-health',
        pathMatch: 'full'
      },
      {
        path: 'portada',
        redirectTo: 'cover15minutes',
        pathMatch: 'full'
      },
      {
        path: 'cover15minutes',
        loadComponent: () => import('./pages/cover15minutes/cover15minutes.component').then(m => m.Cover15MinutesComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'commercial/onboarding',
        loadComponent: () => import('./pages/commercial/commercial.component').then(m => m.CommercialComponent)
      },
      {
        path: 'customers',
        loadComponent: () => import('./pages/customers/customers.component').then(m => m.CustomersComponent)
      },
      {
        path: 'portal',
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          {
            path: 'dashboard',
            loadComponent: () => import('./pages/portal/dashboard/dashboard.component').then(m => m.DashboardComponent)
          },
          {
            path: 'ingresos',
            loadComponent: () => import('./pages/portal/ingresos/ingresos.component').then(m => m.Ingresos)
          },
          {
            path: 'presupuesto',
            loadComponent: () => import('./pages/portal/presupuesto/presupuesto.component').then(m => m.Presupuesto)
          }
        ]
      },
      {
        path: 'news',
        children: [
          { path: '', redirectTo: 'auto-generar', pathMatch: 'full' },
          {
            path: 'auto-generar',
            loadComponent: () => import('./pages/noticias/auto-generar/auto-generar.component').then(m => m.AutoGenerarComponent)
          }
        ]
      },
      {
        path: 'messages',
        children: [
          { path: '', redirectTo: 'segmentacion-bases', pathMatch: 'full' },
          {
            path: 'segmentacion-bases',
            loadComponent: () => import('./pages/mensajeria/segmentacion-bases/segmentacion-bases.component').then(m => m.SegmentacionBasesComponent)
          },
          {
            path: 'analisis-sms',
            loadComponent: () => import('./pages/mensajeria/analisis-sms/analisis-sms.component').then(m => m.AnalisisSmsComponent)
          }
        ]
      }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
