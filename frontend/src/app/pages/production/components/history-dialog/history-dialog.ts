import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProductionService } from '../../../../services/production.service';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-history-dialog',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TagModule],
  templateUrl: './history-dialog.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class HistoryDialog implements OnInit {
  history$ = new BehaviorSubject<any[]>([]);
  loading$ = new BehaviorSubject<boolean>(true);

  constructor(
    private productionService: ProductionService,
    public config: DynamicDialogConfig,
    public ref: DynamicDialogRef
  ) { }

  ngOnInit() {
    const requestId = this.config.data?.id;
    if (requestId) {
      this.loadHistory(requestId);
    }
  }

  loadHistory(id: string) {
    this.loading$.next(true);
    this.productionService.getHistory(id).subscribe({
      next: (data) => {
        this.history$.next(data);
        this.loading$.next(false);
      },
      error: (err) => {
        console.error('Error loading history:', err);
        this.loading$.next(false);
      }
    });
  }

  close() {
    this.ref.close();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString();
  }

  getSeverity(type: string): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | undefined {
    switch (type?.toLowerCase()) {
      case 'create': return 'success';
      case 'update': return 'info';
      case 'delete': return 'danger';
      default: return 'secondary';
    }
  }
}
