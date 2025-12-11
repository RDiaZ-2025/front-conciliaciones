import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AccessHistoryRecord } from '../../../../services/user';

@Component({
  selector: 'app-history-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    TagModule,
    DatePipe
  ],
  templateUrl: './history-dialog.html',
  styleUrl: './history-dialog.scss'
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
