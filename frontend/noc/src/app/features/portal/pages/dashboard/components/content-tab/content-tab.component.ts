import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentStats } from '../../dashboard.service';
import { Chart, registerables } from 'chart.js';
import { DASHBOARD_COLORS, CHART_DEFAULTS, getChartTheme } from '../../dashboard.constants';
import { ThemeService } from '../../../../../../core/services/theme.service';

Chart.register(...registerables);

@Component({
    selector: 'app-content-tab',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './content-tab.component.html',
    styleUrls: ['./content-tab.component.scss']
})
export class ContentTabComponent implements OnChanges, AfterViewInit {
    @Input() data: ContentStats | null = null;
    @Output() drillDown = new EventEmitter<{ author?: string, topic?: string }>();

    @ViewChild('matrixChart') matrixChartCanvas!: ElementRef<HTMLCanvasElement>;
    chartInstance: Chart | null = null;

    private themeService = inject(ThemeService);

    constructor() {
        effect(() => {
            this.themeService.theme();
            if (this.data) {
                setTimeout(() => this.updateChart(), 0);
            }
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['data'] && this.data) {
            setTimeout(() => this.updateChart(), 0);
        }
    }

    ngAfterViewInit(): void {
        if (this.data) {
            setTimeout(() => this.updateChart(), 50);
        }
    }

    updateChart() {
        if (!this.matrixChartCanvas || !this.data) return;

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const ctx = this.matrixChartCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const scatterData = this.data.matrix.map(d => ({
            x: d.sessions,
            y: d.engagement_rate,
            topic: d.topic
        }));

        const theme = getChartTheme(this.themeService.isDarkMode);

        this.chartInstance = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Temas',
                    data: scatterData,
                    backgroundColor: DASHBOARD_COLORS.primaryAlpha,
                    borderColor: DASHBOARD_COLORS.primary,
                    borderWidth: 1,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        titleColor: theme.tooltipText,
                        bodyColor: theme.textColor,
                        borderColor: theme.tooltipBorder,
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 12,
                        usePointStyle: true,
                        callbacks: {
                            label: (context: any) => {
                                const p = context.raw;
                                return ` ${p.topic}: ${p.x} sesiones | ${p.y}% Eng.`;
                            }
                        }
                    } as any
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Volumen (Sesiones)', color: theme.textColor, font: { family: theme.fontFamily } },
                        grid: { color: theme.gridColor },
                        ticks: { color: theme.textColor }
                    },
                    y: {
                        title: { display: true, text: 'Calidad (Engagement %)', color: theme.textColor, font: { family: theme.fontFamily } },
                        grid: { color: theme.gridColor },
                        ticks: { color: theme.textColor }
                    }
                }
            }
        });
    }

    onAuthorClick(author: string) {
        this.drillDown.emit({ author });
    }

    exportToCSV() {
        if (!this.data || !this.data.authors.length) return;

        const headers = ['Autor', 'Artículos', 'Score', 'Sesiones', 'Engagement %'];
        const rows = this.data.authors.map(a => [
            a.author,
            a.articles,
            a.score,
            a.sessions,
            a.engagement_rate
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `ranking_autores_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
