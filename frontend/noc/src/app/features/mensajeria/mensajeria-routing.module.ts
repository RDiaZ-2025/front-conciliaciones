import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SegmentacionBasesComponent } from './pages/segmentacion-bases/segmentacion-bases.component';
import { AnalisisSmsComponent } from './pages/analisis-sms/analisis-sms.component';

import { authGuard } from '../../core/guards/auth.guard';

const routes: Routes = [
    {
        path: 'segmentacion-bases',
        component: SegmentacionBasesComponent,
        canActivate: [authGuard],
        data: { permission: 'segmentacion' }
    },
    {
        path: 'analisis-sms',
        component: AnalisisSmsComponent,
        canActivate: [authGuard],
        data: { permission: 'analisis' }
    },
    { path: '', redirectTo: 'segmentacion-bases', pathMatch: 'full' }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class MensajeriaRoutingModule { }
