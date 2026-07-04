import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-in-sell-action-dialog',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './in-sell-action-dialog.component.html',
  styles: [`
    .action-button {
      width: 100%;
      justify-content: center;
    }
  `]
})
export class InSellActionDialogComponent {
  ref = inject(DynamicDialogRef);

  close(action: 'sold' | 'not_sold' | 'cancel') {
    this.ref.close({ action });
  }
}