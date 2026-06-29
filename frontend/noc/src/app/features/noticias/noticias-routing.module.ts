import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AutoGenerarComponent } from './pages/auto-generar/auto-generar.component';
import { AdminLayoutComponent } from '../admin/layout/admin-layout/admin-layout';
import { authGuard } from '../../core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      {
        path: 'auto-generar',
        component: AutoGenerarComponent,
        canActivate: [authGuard],
        data: { permission: 'auto_generar' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NoticiasRoutingModule { }
