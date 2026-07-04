import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverviewStats } from '../../../../services/dashboard.service';
import { Chart, registerables } from 'chart.js';
import { KpiCard } from '../../../../components/kpi-card/kpi-card.component';
import { DASHBOARD_COLORS, CHART_DEFAULTS, getChartTheme } from '../dashboard.models';
import { ThemeService } from '../../../../services/theme.service';


Chart.register(...registerables);

@Component({
    selector: 'app-overview-tab',
    standalone: true,
    imports: [CommonModule, KpiCard],
    templateUrl: './overview-tab.component.html',
    styleUrls: ['./overview-tab.component.scss']
})

export class OverviewTabComponent implements OnChanges, AfterViewInit {
    @Input() data: OverviewStats | null = null;
    @Output() drillDown = new EventEmitter<{ author?: string, section?: string, topic?: string }>();

    @ViewChild('trendChart') trendChartCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('volumeChart') volumeChartCanvas!: ElementRef<HTMLCanvasElement>;

    trendChartInstance: Chart | null = null;
    volumeChartInstance: Chart | null = null;

    private themeService = inject(ThemeService);

    constructor() {
        // Redraw charts when theme changes
        effect(() => {
            this.themeService.theme(); // Register dependency
            if (this.data) {
                setTimeout(() => this.updateCharts(), 0);
            }
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['data'] && this.data) {
            setTimeout(() => this.updateCharts(), 0);
        }
    }

    ngAfterViewInit(): void {
        if (this.data) {
            setTimeout(() => this.updateCharts(), 50);
        }
    }

    updateCharts() {
        this.updateTrendChart();
        this.updateVolumeChart();
    }

    updateTrendChart() {
        if (!this.trendChartCanvas || !this.data) return;

        if (this.trendChartInstance) {
            this.trendChartInstance.destroy();
        }

        const ctx = this.trendChartCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const labels = this.data.trend.map(d => d.period);
        const sessions = this.data.trend.map(d => d.sessions);
        const engagement = this.data.trend.map(d => d.engagement_rate);
        const theme = getChartTheme(this.themeService.isDarkMode);

        this.trendChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Sesiones',
                        data: sessions,
                        backgroundColor: DASHBOARD_COLORS.primary,
                        borderRadius: 6,
                        order: 2,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Engagement Rate (%)',
                        data: engagement,
                        borderColor: DASHBOARD_COLORS.secondary,
                        backgroundColor: 'transparent',
                        type: 'line',
                        borderWidth: 3,
                        pointBackgroundColor: DASHBOARD_COLORS.secondary,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        tension: 0.3,
                        order: 1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            color: theme.textColor,
                            font: { family: theme.fontFamily, size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        titleColor: theme.tooltipText,
                        bodyColor: theme.textColor,
                        borderColor: theme.tooltipBorder,
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 12,
                        usePointStyle: true
                    } as any
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: theme.textColor, font: { size: 10, family: theme.fontFamily, weight: 'bold' } }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: { color: theme.gridColor },
                        ticks: { color: theme.textColor, font: { size: 10, family: theme.fontFamily, weight: 'bold' } }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: {
                            color: DASHBOARD_COLORS.secondary,
                            callback: function (value) { return value + "%"; },
                            font: { size: 10, family: theme.fontFamily, weight: 'bold' }
                        }
                    }
                }
            }
        });
    }

    updateVolumeChart() {
        if (!this.volumeChartCanvas || !this.data || !this.data.volume.history) return;

        if (this.volumeChartInstance) {
            this.volumeChartInstance.destroy();
        }

        const ctx = this.volumeChartCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const labels = this.data.volume.history.map(d => d.date);
        const articles = this.data.volume.history.map(d => d.articles);
        const views = this.data.volume.history.map(d => d.views);
        const theme = getChartTheme(this.themeService.isDarkMode);

        this.volumeChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Artículos',
                        data: articles,
                        borderColor: DASHBOARD_COLORS.primary,
                        backgroundColor: DASHBOARD_COLORS.primaryLight,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 3,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Vistas',
                        data: views,
                        borderColor: DASHBOARD_COLORS.secondary,
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 3,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            color: theme.textColor,
                            font: { family: theme.fontFamily, size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        titleColor: theme.tooltipText,
                        bodyColor: theme.textColor,
                        borderColor: theme.tooltipBorder,
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 12,
                        usePointStyle: true
                    } as any
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: theme.textColor, font: { size: 10, family: theme.fontFamily, weight: 'bold' } }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Artículos', color: DASHBOARD_COLORS.primary, font: { size: 10, family: theme.fontFamily, weight: 'bold' } },
                        grid: { color: theme.gridColor },
                        ticks: { color: theme.textColor, font: { size: 10, family: theme.fontFamily, weight: 'bold' } }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Vistas', color: DASHBOARD_COLORS.secondary, font: { size: 10, family: theme.fontFamily, weight: 'bold' } },
                        grid: { drawOnChartArea: false },
                        ticks: { color: theme.textColor, font: { size: 10, family: theme.fontFamily, weight: 'bold' } }
                    }
                }
            }
        });
    }

    onHighlightClick(type: 'section' | 'topic' | 'author', value: string) {
        if (!value || value === 'N/A') return;
        this.drillDown.emit({ [type]: value });
    }
}
