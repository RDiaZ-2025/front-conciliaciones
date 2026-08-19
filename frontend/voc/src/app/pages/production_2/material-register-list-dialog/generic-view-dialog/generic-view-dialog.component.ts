import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-generic-view-dialog',
    standalone: true,
    imports: [CommonModule, ButtonModule],
    templateUrl: './generic-view-dialog.component.html',
    styleUrls: ['./generic-view-dialog.component.css']
})
export class GenericViewDialogComponent {
    config = inject(DynamicDialogConfig);
    ref = inject(DynamicDialogRef);

    content = '';

    constructor() {
        this.content = this.config?.data?.content || '';
    }

    close() {
        this.ref.close();
    }
}
