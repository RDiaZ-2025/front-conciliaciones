import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

// 👇 Fíjate que al final agregamos ".component" al nombre del archivo
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout';
import { RolesComponent } from './pages/roles/roles'

const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      {
        path: 'roles',
        component: RolesComponent,
        canActivate: [authGuard],
        data: { requireAdmin: true }
      },
      {
        path: 'mensajeria',
        loadChildren: () => import('../mensajeria/mensajeria.module').then(m => m.MensajeriaModule),
        canActivate: [authGuard]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }