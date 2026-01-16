import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { PageHeaderComponent } from '../../../components/shared/page-header/page-header';
import { RequestsReportService, DashboardStats } from './requests-report.service';

@Component({
  selector: 'app-requests-report',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ChartModule,
    TableModule,
    ButtonModule,
    AvatarModule,
    PageHeaderComponent
  ],
  templateUrl: './requests-report.component.html',
  styleUrl: './requests-report.component.scss'
})
export class RequestsReportComponent implements OnInit {
  private service = inject(RequestsReportService);
  
  stats = signal<DashboardStats | null>(null);
  
  workloadChartData: any;
  workloadChartOptions: any;
  
  executionChartData: any;
  executionChartOptions: any;

  ngOnInit() {
    this.loadStats();
    this.initChartOptions();
  }

  loadStats() {
    this.service.getDashboardStats().subscribe(data => {
      this.stats.set(data);
      this.initCharts(data);
    });
  }

  initCharts(data: DashboardStats) {
    // Workload Chart (Horizontal Bar)
    this.workloadChartData = {
      labels: data.workload.map(w => w.userName),
      datasets: [
        {
          label: 'Carga de Trabajo',
          backgroundColor: data.workload.map(w => w.status === 'overloaded' ? '#EF4444' : w.status === 'underutilized' ? '#F59E0B' : '#22C55E'),
          data: data.workload.map(w => w.percentage)
        }
      ]
    };

    // Execution Status Chart (Pie/Doughnut)
    this.executionChartData = {
      labels: ['En Curso', 'Completado', 'Pendiente'],
      datasets: [
        {
          data: [
            data.executionStatus.inProgress, 
            data.executionStatus.completed, 
            data.executionStatus.pending
          ],
          backgroundColor: ['#3B82F6', '#22C55E', '#9CA3AF'],
          hoverBackgroundColor: ['#2563EB', '#16A34A', '#6B7280']
        }
      ]
    };
  }

  initChartOptions() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    this.workloadChartOptions = {
      indexAxis: 'y',
      maintainAspectRatio: false,
      aspectRatio: 0.8,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary,
            callback: (value: number) => value + '%'
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false
          },
          max: 120
        },
        y: {
          ticks: {
            color: textColorSecondary
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false
          }
        }
      }
    };

    this.executionChartOptions = {
      cutout: '60%',
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        }
      }
    };
  }

  getStatusSeverity(status: string) {
    if (status.includes('ATRASADA')) return 'danger';
    if (status.includes('En Riesgo')) return 'warn';
    return 'success';
  }
}
