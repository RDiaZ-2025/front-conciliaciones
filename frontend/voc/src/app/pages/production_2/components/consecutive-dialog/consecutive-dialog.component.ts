import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-consecutive-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputNumberModule
  ],
  templateUrl: './consecutive-dialog.component.html'
})
export class ConsecutiveDialogComponent {
  ref = inject(DynamicDialogRef);
  config = inject(DynamicDialogConfig);

  consecutive: number | null = null;

  cancel() {
    this.ref.close();
  }

  confirm() {
    if (this.consecutive) {
      this.ref.close({ consecutive: this.consecutive });
    }
  }
}
