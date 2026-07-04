import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AutoGenerarComponent } from './auto-generar/auto-generar.component';
import { AdminLayoutComponent } from '../admin/admin-layout/admin-layout.component';
import { authGuard } from '../../guards/auth.guard';

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
