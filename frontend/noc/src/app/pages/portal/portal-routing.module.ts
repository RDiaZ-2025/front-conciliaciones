import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../../guards/auth.guard';
import { DashboardComponent } from './dashboard/dashboard.component';
import { Ingresos } from './ingresos/ingresos.component';
import { Presupuesto } from './presupuesto/presupuesto.component';
import { AdminLayoutComponent } from '../admin/admin-layout/admin-layout.component';

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
