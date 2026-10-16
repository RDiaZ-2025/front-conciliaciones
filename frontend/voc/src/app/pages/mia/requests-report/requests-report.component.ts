import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { LucideIconComponent } from '../../../components/lucide-icon/lucide-icon.component';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { RequestBusinessStatus, RequestsAnalytics, RequestsReportService } from './requests-report.service';
import { REQUEST_STATUS_LABELS, RequestsReportExportService } from './requests-report-export.service';

type DatePreset = 'month' | '30d' | '90d' | 'year' | 'custom';

const STATUS_COLORS = { in_progress: '#3B82F6', returned: '#F59E0B', completed: '#22C55E', created: '#EE3829' };
const PALETTE = ['#EE3829', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#14B8A6', '#EC4899', '#64748B', '#F97316', '#0EA5E9'];
const CHART_TOP_LIMIT = 10;

@Component({
  selector: 'app-requests-report',
  standalone: true,
  imports: [
    LucideIconComponent,
    CommonModule,
    FormsModule,
    ChartModule,
    TableModule,
    ButtonModule,
    PageHeaderComponent,
    SkeletonModule,
    TooltipModule,
    SelectModule,
    MultiSelectModule,
    DatePickerModule,
    TagModule,
    InputTextModule
  ],
  templateUrl: './requests-report.component.html',
  styleUrl: './requests-report.component.scss'
})
export class RequestsReportComponent implements OnInit {
  private service = inject(RequestsReportService);
  private exportService = inject(RequestsReportExportService);

  data = signal<RequestsAnalytics | null>(null);
  loading = signal<boolean>(false);
  exporting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  datePreset = signal<DatePreset>('30d');
  customRange = signal<Date[] | null>(null);
  selectedFormIds = signal<number[]>([]);
  selectedAreaIds = signal<number[]>([]);

  readonly presetOptions: { label: string; value: DatePreset }[] = [
    { label: 'Este mes', value: 'month' },
    { label: 'Últimos 30 días', value: '30d' },
    { label: 'Últimos 90 días', value: '90d' },
    { label: 'Este año', value: 'year' },
    { label: 'Personalizado', value: 'custom' }
  ];

  private chartTheme = this.readChartTheme();

  trendChart = computed(() => {
    const d = this.data();
    if (!d) return null;
    return {
      labels: d.trend.labels.map(l => this.formatTrendLabel(l, d.trend.granularity)),
      datasets: [
        { label: 'Creadas', data: d.trend.created, borderColor: STATUS_COLORS.created, backgroundColor: 'rgba(238,56,41,0.12)', fill: true, tension: 0.35, pointRadius: 3 },
        { label: 'Finalizadas', data: d.trend.completed, borderColor: STATUS_COLORS.completed, backgroundColor: 'rgba(34,197,94,0.10)', fill: true, tension: 0.35, pointRadius: 3 }
      ]
    };
  });

  statusChart = computed(() => {
    const s = this.data()?.summary;
    if (!s || s.total === 0) return null;
    return {
      labels: ['En curso', 'Devueltas', 'Finalizadas'],
      datasets: [{
        data: [s.inProgress, s.returned, s.completed],
        backgroundColor: [STATUS_COLORS.in_progress, STATUS_COLORS.returned, STATUS_COLORS.completed],
        borderWidth: 0
      }]
    };
  });

  areaChart = computed(() => {
    const rows = this.data()?.byArea || [];
    if (rows.length === 0) return null;
    return {
      labels: rows.map(r => r.area),
      datasets: [
        { label: 'En curso', data: rows.map(r => r.inProgress), backgroundColor: STATUS_COLORS.in_progress, borderRadius: 4 },
        { label: 'Devueltas', data: rows.map(r => r.returned), backgroundColor: STATUS_COLORS.returned, borderRadius: 4 },
        { label: 'Finalizadas', data: rows.map(r => r.completed), backgroundColor: STATUS_COLORS.completed, borderRadius: 4 }
      ]
    };
  });

  formChart = computed(() => {
    const rows = this.data()?.byForm || [];
    if (rows.length === 0) return null;
    return {
      labels: rows.map(r => r.label),
      datasets: [{ data: rows.map(r => r.count), backgroundColor: rows.map((_, i) => PALETTE[i % PALETTE.length]), borderWidth: 0 }]
    };
  });

  workloadChart = computed(() => {
    const rows = (this.data()?.workload || []).slice(0, CHART_TOP_LIMIT);
    if (rows.length === 0) return null;
    return {
      labels: rows.map(r => r.userName),
      datasets: [{ label: 'Tareas pendientes', data: rows.map(r => r.pending), backgroundColor: STATUS_COLORS.in_progress, borderRadius: 4 }]
    };
  });

  bottleneckChart = computed(() => {
    const rows = (this.data()?.pendingByStage || []).slice(0, CHART_TOP_LIMIT);
    if (rows.length === 0) return null;
    return {
      labels: rows.map(r => r.stage),
      datasets: [{ label: 'Tareas pendientes', data: rows.map(r => r.pending), backgroundColor: STATUS_COLORS.returned, borderRadius: 4 }]
    };
  });

  stageTimeChart = computed(() => {
    const rows = this.data()?.stageTimes || [];
    if (rows.length === 0) return null;
    return {
      labels: rows.map(r => r.stage),
      datasets: [{ label: 'Horas promedio', data: rows.map(r => r.avgHours), backgroundColor: '#8B5CF6', borderRadius: 4 }]
    };
  });

  lineOptions = this.buildCartesianOptions(false, false, true);
  stackedBarOptions = this.buildCartesianOptions(true, true, true);
  horizontalBarOptions = this.buildCartesianOptions(true, false, false);
  stageTimeOptions = {
    ...this.buildCartesianOptions(true, false, false),
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: any) => ` ${this.formatHours(ctx.raw)}` } }
    }
  };
  doughnutOptions = {
    cutout: '65%',
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { color: this.chartTheme.text, usePointStyle: true, padding: 16 } } }
  };

  ngOnInit() {
    this.load();
  }

  load() {
    const range = this.getDateRange();
    if (!range) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.getAnalytics({
      dateFrom: range.from,
      dateTo: range.to,
      formIds: this.selectedFormIds(),
      workflowIds: this.selectedAreaIds()
    }).subscribe({
      next: res => {
        this.data.set(res.data);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.status === 403
          ? 'No tienes acceso al informe de solicitudes. Solicita el permiso de gestión de producción o ser líder de un equipo.'
          : 'No se pudo cargar el informe. Intenta nuevamente.');
      }
    });
  }

  onPresetChange(preset: DatePreset) {
    this.datePreset.set(preset);
    if (preset !== 'custom') this.load();
  }

  onCustomRangeChange(range: Date[] | null) {
    this.customRange.set(range);
    if (range && range[0] && range[1]) this.load();
  }

  clearFilters() {
    this.selectedFormIds.set([]);
    this.selectedAreaIds.set([]);
    this.datePreset.set('30d');
    this.customRange.set(null);
    this.load();
  }

  async exportExcel() {
    const d = this.data();
    if (!d) return;
    this.exporting.set(true);
    try {
      await this.exportService.exportToExcel(d, this.getPeriodLabel());
    } finally {
      this.exporting.set(false);
    }
  }

  getPeriodLabel(): string {
    const range = this.getDateRange();
    if (!range) return '';
    const fmt = (d: Date) => d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${fmt(range.from)} – ${fmt(range.to)}`;
  }

  getStatusLabel(status: RequestBusinessStatus): string {
    return REQUEST_STATUS_LABELS[status];
  }

  getStatusSeverity(status: RequestBusinessStatus): 'info' | 'warn' | 'success' | 'danger' {
    if (status === 'returned') return 'warn';
    if (status === 'completed') return 'success';
    if (status === 'deleted') return 'danger';
    return 'info';
  }

  getAgeSeverity(days: number): 'success' | 'warn' | 'danger' | 'secondary' {
    const avg = this.data()?.summary.avgPendingAgeDays;
    if (avg === null || avg === undefined) return 'secondary';
    if (days > avg * 2) return 'danger';
    if (days > avg) return 'warn';
    return 'success';
  }

  formatDays(days: number | null | undefined): string {
    if (days === null || days === undefined) return '—';
    if (days < 1) return `${Math.round(days * 24)} h`;
    return `${days.toLocaleString('es-CO', { maximumFractionDigits: 1 })} d`;
  }

  formatHours(hours: number | null | undefined): string {
    if (hours === null || hours === undefined) return '—';
    if (hours < 24) return `${hours.toLocaleString('es-CO', { maximumFractionDigits: 1 })} h`;
    return `${(hours / 24).toLocaleString('es-CO', { maximumFractionDigits: 1 })} d`;
  }

  private getDateRange(): { from: Date; to: Date } | null {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const daysAgo = (n: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - n + 1);

    switch (this.datePreset()) {
      case 'month': return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfToday };
      case '30d': return { from: daysAgo(30), to: endOfToday };
      case '90d': return { from: daysAgo(90), to: endOfToday };
      case 'year': return { from: new Date(now.getFullYear(), 0, 1), to: endOfToday };
      case 'custom': {
        const range = this.customRange();
        if (!range || !range[0] || !range[1]) return null;
        const to = new Date(range[1]);
        to.setHours(23, 59, 59, 999);
        return { from: new Date(range[0]), to };
      }
    }
  }

  private formatTrendLabel(key: string, granularity: 'day' | 'month'): string {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d || 1);
    return granularity === 'day'
      ? date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
      : date.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
  }

  private buildCartesianOptions(horizontal: boolean, stacked: boolean, showLegend: boolean) {
    const { textMuted, border, text } = this.chartTheme;
    return {
      indexAxis: horizontal ? 'y' : 'x',
      maintainAspectRatio: false,
      plugins: {
        legend: { display: showLegend, position: 'bottom', labels: { color: text, usePointStyle: true, padding: 16 } }
      },
      scales: {
        x: { stacked, beginAtZero: true, ticks: { color: textMuted, precision: 0 }, grid: { color: border, drawBorder: false } },
        y: { stacked, beginAtZero: true, ticks: { color: textMuted, precision: 0 }, grid: { color: horizontal ? 'transparent' : border, drawBorder: false } }
      }
    };
  }

  private readChartTheme() {
    const style = getComputedStyle(document.documentElement);
    return {
      text: style.getPropertyValue('--p-text-color').trim(),
      textMuted: style.getPropertyValue('--p-text-muted-color').trim(),
      border: style.getPropertyValue('--p-content-border-color').trim()
    };
  }
}
