import { LucideIconComponent } from '../../../components/shared/lucide-icon/lucide-icon.component';
import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AccessHistoryRecord } from '../../../services/user.service';

@Component({
  selector: 'app-history-dialog',
  standalone: true,
  imports: [
    LucideIconComponent,
    CommonModule,
    ButtonModule,
    TableModule,
    TagModule,
    DatePipe
  ],
  templateUrl: './history-dialog.component.html',
  styleUrl: './history-dialog.component.scss'
})
export class HistoryDialogComponent {
  history: AccessHistoryRecord[] = [];

  constructor(
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig
  ) {
    this.history = config.data.history || [];
  }
}
