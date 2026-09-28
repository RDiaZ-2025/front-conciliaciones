import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { LucideIconComponent } from '../../components/lucide-icon/lucide-icon.component';
import { SystemHealthService, SystemHealthResponse } from '../../services/system-health.service';

@Component({
  selector: 'app-system-health',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    PageHeaderComponent,
    LucideIconComponent
  ],
  templateUrl: './system-health.component.html',
  styleUrls: ['./system-health.component.scss']
})
export class SystemHealthComponent implements OnInit {
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

  ngOnInit() {
    this.refresh();
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
