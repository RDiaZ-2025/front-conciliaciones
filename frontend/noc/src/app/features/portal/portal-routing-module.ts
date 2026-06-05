import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { Ingresos } from './pages/ingresos/ingresos';
import { Presupuesto } from './pages/presupuesto/presupuesto';
import { AdminLayoutComponent } from '../admin/layout/admin-layout/admin-layout';

const routes: Routes = [
    {
        path: '',
        component: AdminLayoutComponent,
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                component: DashboardComponent,
                canActivate: [authGuard],
                data: { permission: 'dashboard' }
            },
            {
                path: 'ingresos',
                component: Ingresos,
                canActivate: [authGuard],
                data: { permission: 'ingresos' }
            },
            {
                path: 'presupuesto',
                component: Presupuesto,
                canActivate: [authGuard],
                data: { permission: 'presupuesto' }
            }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class PortalRoutingModule { }
