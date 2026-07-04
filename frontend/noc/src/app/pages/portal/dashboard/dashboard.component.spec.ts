import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { DashboardService, DashboardStats, DashboardFilters, Article } from '../../../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './dashboard.component.spec.ts.component.html',
  styleUrls: ['./dashboard.component.spec.ts.component.scss']
})
export class DashboardComponent implements OnInit {

  stats: DashboardStats | null = null;
  filtersOptions: DashboardFilters = { authors: [], topics: [], categories: [] };
  topArticles: Article[] = [];
  isLoading = true;

  filters = {
    start_date: '',
    end_date: '',
    author: '',
    topic: '',
    category: ''
  };

  // --- Charts Configuration ---

  // 1. Trend (Month) - Bar
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } }, // Hide legend for cleaner look
    scales: { x: { grid: { display: false } }, y: { grid: { color: '#f3f4f6' } } }
  };
  public barChartType: ChartType = 'bar';
  public barChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  // 2. Trend (Year) - Bar
  public yearChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: '#f3f4f6' } } }
  };
  public yearChartType: ChartType = 'bar';
  public yearChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  // 3. Section Dist - Pie
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } }
  };
  public pieChartType: ChartType = 'pie';
  public pieChartData: ChartData<'pie'> = { labels: [], datasets: [] };

  // 4. Topics - Horizontal Bar
  public topicChartOptions: ChartConfiguration['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { grid: { display: false } } }
  };
  public topicChartType: ChartType = 'bar';
  public topicChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  // 5. Category - Doughnut
  public categoryChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } }
  };
  public categoryChartType: 'doughnut' = 'doughnut';
  public categoryChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };

  // 6. Performance Tiers - Bar (Vertical or Doughnut) - Let's use Bar for comparison
  public tierChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: '#f3f4f6' } } }
  };
  public tierChartType: ChartType = 'bar';
  public tierChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  // 7. Users per Section (Radar)
  public radarChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { r: { pointLabels: { font: { size: 10 } }, grid: { color: '#f3f4f6' } } }
  };
  public radarChartType: ChartType = 'radar';
  public radarChartData: ChartData<'radar'> | undefined;

  // 8. Authors (Horizontal Bar)
  public authorChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { grid: { display: false } } },
    indexAxis: 'y', // Horizontal bars
  };
  public authorChartType: ChartType = 'bar';
  public authorChartData: ChartData<'bar'> | undefined;

  // Colors Palette
  private colors = {
    red: '#E63946',
    navy: '#1D3557',
    blue: '#457B9D',
    cyan: '#A8DADC',
    white: '#F1FAEE',
    gold: '#F4A261',
    orange: '#E76F51',
    gray: '#E5E7EB'
  };

  constructor(private dashboardService: DashboardService) { }

  ngOnInit(): void {
    // Initial load
    this.isLoading = true;
    this.loadFilters();
    this.loadStats();
    this.loadTopArticles();
  }

  loadFilters() {
    this.dashboardService.getFilters().subscribe(data => {
      this.filtersOptions = data;
    });
  }

  loadStats() {
    this.dashboardService.getStats(this.filters).subscribe(data => {
      this.stats = data;
      this.updateCharts(data);
    });
  }

  loadTopArticles() {
    this.dashboardService.getTopArticles().subscribe({
      next: (data) => {
        this.topArticles = data;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  updateCharts(data: DashboardStats) {
    // 1. Month Trend
    this.barChartData = {
      labels: data.articles_by_month.map(d => d.mes),
      datasets: [{
        data: data.articles_by_month.map(d => d.count),
        label: 'Artículos',
        backgroundColor: this.colors.red,
        hoverBackgroundColor: this.colors.navy,
        borderRadius: 4
      }]
    };

    // 2. Year Trend
    this.yearChartData = {
      labels: data.articles_by_year.map(d => d.year),
      datasets: [{
        data: data.articles_by_year.map(d => d.count),
        label: 'Artículos',
        backgroundColor: this.colors.navy,
        hoverBackgroundColor: this.colors.red,
        borderRadius: 4
      }]
    };

    // 3. Section Dist
    this.pieChartData = {
      labels: data.articles_by_section.map(d => d.seccion),
      datasets: [{
        data: data.articles_by_section.map(d => d.count),
        backgroundColor: [this.colors.red, this.colors.navy, this.colors.blue, this.colors.cyan, this.colors.gold, this.colors.orange]
      }]
    };

    // 4. Topics (Top 10)
    // Horizontal Bar needs mapping
    this.topicChartData = {
      labels: data.articles_by_topic.map(d => d.topic),
      datasets: [{
        data: data.articles_by_topic.map(d => d.count),
        label: 'Artículos',
        backgroundColor: this.colors.blue,
        borderRadius: 4,
        barThickness: 10
      }]
    };

    // 5. Category (Entity)
    this.categoryChartData = {
      labels: data.articles_by_category.map(d => d.category),
      datasets: [{
        data: data.articles_by_category.map(d => d.count),
        backgroundColor: [this.colors.gold, this.colors.navy, this.colors.red, this.colors.cyan]
      }]
    };

    // 6. Performance Tiers
    // Map specific colors for Diamond/Gold/Silver/Bronze
    // Tiers often come in specific order from backend? Backend returns list of dicts.
    // Let's assume order is fixed or we map by name if needed.
    // For simplicity, just map data directly.
    const tierColors = {
      "Diamante (>50k)": "#b9f2ff", // Diamond-ish
      "Oro (10k-50k)": "#ffd700",   // Gold
      "Plata (1k-10k)": "#c0c0c0",  // Silver
      "Bronce (<1k)": "#cd7f32"     // Bronze
    };
    // We should map backend data to colors
    const tiersData = data.performance_tiers;
    this.tierChartData = {
      labels: tiersData.map(d => d.tier),
      datasets: [{
        data: tiersData.map(d => d.count),
        backgroundColor: tiersData.map(d => tierColors[d.tier as keyof typeof tierColors] || this.colors.gray),
        borderRadius: 4
      }]
    };

    // 7. Users Radar
    this.radarChartData = {
      labels: data.users_by_section.map(d => d.seccion),
      datasets: [{
        data: data.users_by_section.map(d => d.count),
        label: 'Usuarios Únicos',
        borderColor: this.colors.red,
        backgroundColor: 'rgba(230, 57, 70, 0.2)',
        pointBackgroundColor: this.colors.navy,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: this.colors.navy
      }]
    };

    // 8. Authors
    this.authorChartData = {
      labels: data.articles_by_author.map(d => d.author),
      datasets: [{
        data: data.articles_by_author.map(d => d.total_views),
        label: 'Vistas Totales',
        backgroundColor: this.colors.orange,
        hoverBackgroundColor: this.colors.red,
        borderRadius: 4,
        barThickness: 20
      }]
    };
  }

  applyFilters() {
    this.loadStats();
  }

  clearFilters() {
    this.filters = {
      start_date: '',
      end_date: '',
      author: '',
      topic: '',
      category: ''
    };
    this.loadStats();
  }

}