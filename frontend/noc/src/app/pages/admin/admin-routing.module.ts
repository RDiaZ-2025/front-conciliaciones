import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../../guards/auth.guard';

// 👇 Fíjate que al final agregamos ".component" al nombre del archivo
import { AdminLayoutComponent } from './admin-layout/admin-layout.component';
import { RolesComponent } from './roles/roles.component'

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