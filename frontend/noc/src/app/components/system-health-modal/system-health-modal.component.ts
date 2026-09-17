import { Component, model, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { LucideIconComponent } from '../lucide-icon/lucide-icon.component';
import { SystemHealthService, SystemHealthResponse } from '../../services/system-health.service';

@Component({
  selector: 'app-system-health-modal',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    LucideIconComponent
  ],
  templateUrl: './system-health-modal.component.html',
  styleUrls: ['./system-health-modal.component.scss']
})
export class SystemHealthModalComponent {
  visible = model<boolean>(false);

  private healthService = inject(SystemHealthService);

  loading = signal<boolean>(false);
  healthData = signal<SystemHealthResponse | null>(null);
  lastChecked = signal<Date | null>(null);

  statusSeverity = computed<'success' | 'warn' | 'danger'>(() => {
    const data = this.healthData();
    if (!data) return 'warn';
    if (data.status === 'healthy') return 'success';
    if (data.status === 'degraded') return 'warn';
    return 'danger';
  });

  statusLabel = computed<string>(() => {
    const data = this.healthData();
    if (!data) return 'Verificando...';
    if (data.status === 'healthy') return 'Saludable / Operacional';
    if (data.status === 'degraded') return 'Degradado';
    return 'Fuera de Línea';
  });

  constructor() {
    // Al abrir el modal (visible cambia a true), consultar automáticamente el estado actualizado
    effect(() => {
      if (this.visible()) {
        this.refresh();
      }
    });
  }

  close() {
    this.visible.set(false);
  }

  refresh() {
    this.loading.set(true);
    this.healthService.getHealth().subscribe({
      next: (data) => {
        this.healthData.set(data);
        this.lastChecked.set(new Date());
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
