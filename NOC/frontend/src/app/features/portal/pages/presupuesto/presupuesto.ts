import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';

export interface ResumenMensual {
  mes: string;
  total_ppto: number;
  total_ejecucion: number;
  diferencia: number;
  porcentaje_cumplimiento: number;
}

export interface ResumenFuente {
  fuente: string;
  seccion: string;
  total_ppto: number;
  total_ejecucion: number;
  diferencia: number;
  porcentaje_cumplimiento: number;
}

export interface DashboardResponse {
  resumen_mensual: ResumenMensual[];
  desglose_fuentes: ResumenFuente[];
  total_anual_ppto: number;
  total_anual_ejecucion: number;
  diferencia_anual: number;
  porcentaje_anual: number;
}

@Component({
  selector: 'app-presupuesto',
  templateUrl: './presupuesto.html',
  styleUrls: ['./presupuesto.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class Presupuesto implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartDona') chartDonaCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartBarras') chartBarrasCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartEvolucion') chartEvolucionCanvas!: ElementRef<HTMLCanvasElement>;

  private apiUrl = 'http://localhost:8000';
  private donaChart: Chart | null = null;
  private barrasChart: Chart | null = null;
  private evolucionChart: Chart | null = null;
  
  data: DashboardResponse | null = null;
  isLoading: boolean = true;
  hasError: boolean = false;
  errorMessage: string = '';
  isImporting: boolean = false;
  importSuccess: string = '';

  activeTab: 'director' | 'analitico' = 'director';
  periodFilter: 'TOTAL' | 'LAST_MONTH' | 'LAST_3_MONTHS' | 'YTD' = 'YTD';

  // "Por Qué" analysis
  mejorFuente: ResumenFuente | null = null;
  peorFuente: ResumenFuente | null = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngAfterViewInit(): void {
    // Graficos se renderizan si hay data y estamos en director
    if (this.data && this.activeTab === 'director') {
        this.renderizarGraficas();
    }
  }

  ngOnDestroy(): void {
    this.destruirGraficas();
  }

  setTab(tab: 'director' | 'analitico') {
      this.activeTab = tab;
      this.cdr.detectChanges();
      if (tab === 'director') {
          setTimeout(() => this.renderizarGraficas(), 100);
      } else {
          this.destruirGraficas();
      }
  }

  setPeriodFilter(filter: 'TOTAL' | 'LAST_MONTH' | 'LAST_3_MONTHS' | 'YTD') {
      this.periodFilter = filter;
      this.cargarDatos();
  }

  cargarDatos(): void {
    this.isLoading = true;
    this.hasError = false;
    
    this.http.get<DashboardResponse>(`${this.apiUrl}/portal-presupuesto/dashboard?year=2026&filter_type=${this.periodFilter}`)
      .subscribe({
        next: (res) => {
          this.data = res;
          this.analizarFuentes();
          this.isLoading = false;
          this.cdr.detectChanges();
          
          if (this.activeTab === 'director') {
              setTimeout(() => this.renderizarGraficas(), 100);
          }
        },
        error: (err) => {
          console.error('Error cargando presupuesto:', err);
          this.isLoading = false;
          this.hasError = true;
          if (err.status === 403) {
            this.errorMessage = 'Módulo protegido: No tienes permisos para visualizar el presupuesto.';
          } else {
            this.errorMessage = 'Error al cargar los datos del presupuesto.';
          }
          this.cdr.detectChanges();
        }
      });
  }

  importarPresupuesto(): void {
    if (this.isImporting) return;
    this.isImporting = true;
    this.importSuccess = '';
    this.hasError = false;
    
    this.http.post<any>(`${this.apiUrl}/portal-presupuesto/importar`, {})
      .subscribe({
        next: (res) => {
          this.importSuccess = res.mensaje || 'Presupuesto importado exitosamente.';
          this.isImporting = false;
          this.cargarDatos();
        },
        error: (err) => {
          console.error('Error importando presupuesto:', err);
          this.isImporting = false;
          this.hasError = true;
          this.errorMessage = 'Error al importar los datos desde el archivo Excel.';
          this.cdr.detectChanges();
        }
      });
  }

  private analizarFuentes(): void {
      if (!this.data || !this.data.desglose_fuentes.length) return;
      
      // Ordenar por diferencia absoluta (para encontrar los extremos)
      // diferencia = ppto - ejecucion. 
      // Positiva alta = Mayor ahorro. 
      // Negativa baja = Mayor déficit/gasto excesivo.
      
      let mejor: ResumenFuente | null = null;
      let peor: ResumenFuente | null = null;
      
      for (const f of this.data.desglose_fuentes) {
          if (!mejor || f.diferencia > mejor.diferencia) {
              mejor = f;
          }
          if (!peor || f.diferencia < peor.diferencia) {
              peor = f;
          }
      }
      
      this.mejorFuente = mejor;
      this.peorFuente = peor;
  }

  private destruirGraficas(): void {
      if (this.donaChart) this.donaChart.destroy();
      if (this.barrasChart) this.barrasChart.destroy();
      if (this.evolucionChart) this.evolucionChart.destroy();
  }

  private renderizarGraficas(): void {
      this.destruirGraficas();
      if (!this.data) return;

      // 1. Gráfica de Velocímetro (Total Ppto vs Ejecución)
      if (this.chartDonaCanvas && this.chartDonaCanvas.nativeElement) {
          const ctxDona = this.chartDonaCanvas.nativeElement.getContext('2d');
          if (ctxDona) {
              const isOverBudget = this.data.total_anual_ejecucion > this.data.total_anual_ppto;
              const execVal = Math.min(this.data.total_anual_ejecucion, this.data.total_anual_ppto);
              const remVal = Math.max(0, this.data.total_anual_ppto - this.data.total_anual_ejecucion);
              
              const color = isOverBudget ? 'rgba(239, 68, 68, 1)' : 'rgba(16, 185, 129, 1)'; // Red or Emerald
              const bgColor = 'rgba(255, 255, 255, 0.1)';

              this.donaChart = new Chart(ctxDona, {
                  type: 'doughnut',
                  data: {
                      labels: ['Consumido', 'Disponible'],
                      datasets: [{
                          data: [execVal, remVal],
                          backgroundColor: [color, bgColor],
                          borderWidth: 0,
                          hoverOffset: 4
                      }]
                  },
                  options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      circumference: 180, // Media dona (Velocimetro)
                      rotation: 270,
                      cutout: '80%',
                      plugins: {
                          legend: { display: false },
                          tooltip: {
                              callbacks: {
                                  label: (context) => {
                                      if (context.dataIndex === 0) {
                                          return ' Ejecución: ' + new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0}).format(this.data!.total_anual_ejecucion);
                                      } else {
                                          return ' Disponible: ' + new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0}).format(remVal);
                                      }
                                  }
                              }
                          }
                      }
                  }
              });
          }
      }

      // 2. Gráfica de Barras (Variación por Fuente)
      if (this.chartBarrasCanvas && this.chartBarrasCanvas.nativeElement) {
          const ctxBarras = this.chartBarrasCanvas.nativeElement.getContext('2d');
          if (ctxBarras) {
              let ordenadas = [...this.data.desglose_fuentes].sort((a, b) => b.diferencia - a.diferencia);
              let topFuentes = [];
              if (ordenadas.length > 10) {
                  topFuentes = [...ordenadas.slice(0, 5), ...ordenadas.slice(-5)];
              } else {
                  topFuentes = ordenadas;
              }

              const labels = topFuentes.map(f => f.fuente);
              const variaciones = topFuentes.map(f => f.diferencia);
              const porcentajes = topFuentes.map(f => f.porcentaje_cumplimiento); // Extract percentages
              const colores = variaciones.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'); // Verde ahorro, Rojo deficit

              // Custom plugin for data labels on bars
              const barLabelsPlugin = {
                  id: 'barLabels',
                  afterDatasetsDraw(chart: any) {
                      const { ctx } = chart;
                      ctx.save();
                      
                      chart.getDatasetMeta(0).data.forEach((datapoint: any, index: number) => {
                          const value = variaciones[index];
                          const percent = porcentajes[index];
                          
                          const prefix = value > 0 ? '+' : '';
                          const moneyStr = `${prefix}${new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0}).format(value)}`;
                          
                          // Ahorro (Verde): < 100%. Sobrecosto (Rojo): > 100%
                          // Queremos mostrar el porcentaje de ahorro real (ej. si cumplimiento es 80%, ahorró 20%)
                          // O simplemente mostrar el % de cumplimiento. El usuario pidio "% que ahorramos".
                          // Ahorro = 100 - cumplimiento (si es positivo). Si es deficit, sobregiro = cumplimiento - 100.
                          let porcentajeTexto = "";
                          if (value >= 0) {
                              porcentajeTexto = `(Ahorro: ${(100 - percent).toFixed(1)}%)`;
                          } else {
                              porcentajeTexto = `(Sobregiro: ${(percent - 100).toFixed(1)}%)`;
                          }

                          const text = `${moneyStr} ${porcentajeTexto}`;
                          
                          ctx.font = 'bold 12px "Outfit", sans-serif';
                          ctx.fillStyle = '#cbd5e1';
                          ctx.textBaseline = 'middle';
                          
                          // Posicionar texto fuera de la barra para mayor legibilidad
                          // Usamos la posicion de valor 0 para alinear a la derecha y no pisar los textos del eje Y
                          const zeroX = chart.scales.x.getPixelForValue(0);
                          
                          ctx.textAlign = 'left';
                          if (value >= 0) {
                              ctx.fillText(text, datapoint.x + 8, datapoint.y);
                          } else {
                              ctx.fillText(text, zeroX + 8, datapoint.y);
                          }
                      });
                      ctx.restore();
                  }
              };

              this.barrasChart = new Chart(ctxBarras, {
                  type: 'bar',
                  data: {
                      labels: labels,
                      datasets: [{
                          label: 'Variación (Ahorro / Déficit)',
                          data: variaciones,
                          backgroundColor: colores,
                          borderRadius: 6
                      }]
                  },
                  plugins: [barLabelsPlugin],
                  options: {
                      layout: {
                          padding: { left: 130, right: 130 } // Espacio para que quepa el texto
                      },
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y', // Barras horizontales
                      plugins: {
                          legend: { display: false },
                          tooltip: {
                              callbacks: {
                                  label: (context) => {
                                      let value = context.raw as number;
                                      let prefix = value > 0 ? '+' : '';
                                      return ` ${prefix}${new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0}).format(value)}`;
                                  }
                              }
                          }
                      },
                      scales: {
                          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
                          y: { grid: { display: false }, ticks: { color: '#cbd5e1', font: { size: 11 } } }
                      }
                  }
              });
          }
      }

      // 3. Gráfico Mixto (Evolución Mensual Burn-Rate)
      if (this.chartEvolucionCanvas && this.chartEvolucionCanvas.nativeElement) {
          const ctxEvo = this.chartEvolucionCanvas.nativeElement.getContext('2d');
          if (ctxEvo && this.data.resumen_mensual.length > 0) {
              const labels = this.data.resumen_mensual.map(m => {
                  const date = new Date(m.mes + 'T00:00:00');
                  return date.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
              });
              const pptos = this.data.resumen_mensual.map(m => m.total_ppto);
              const ejecs = this.data.resumen_mensual.map(m => m.total_ejecucion);

              // Lógica de colores por punto: si la ejecución superó al presupuesto, el punto se pinta de rojo
              const pointColors = ejecs.map((ejec, i) => ejec > pptos[i] ? 'rgba(239, 68, 68, 1)' : 'rgba(16, 185, 129, 1)');
              const pointSizes = ejecs.map((ejec, i) => ejec > pptos[i] ? 7 : 4); // Punto más grande si es rojo

              // Plugin para escribir valores encima de los puntos
              const evoLabelsPlugin = {
                  id: 'evoLabels',
                  afterDatasetsDraw(chart: any) {
                      const { ctx } = chart;
                      ctx.save();
                      
                      // Solo queremos dibujar sobre la linea (dataset 0)
                      chart.getDatasetMeta(0).data.forEach((datapoint: any, index: number) => {
                          const ejec = ejecs[index];
                          const ppto = pptos[index];
                          let percentage = 0;
                          
                          if (ppto > 0) {
                              percentage = (ejec / ppto) * 100;
                          } else if (ejec > 0) {
                              percentage = 200; // Fake > 100% para forzar logica de sobregiro
                          }

                          let porcentajeTexto = "";
                          let textColor = '';
                          const diferencia = ppto - ejec;

                          if (ejec <= ppto) {
                              const ahorro = ppto > 0 ? 100 - percentage : 0;
                              porcentajeTexto = `Ahorro ${ahorro.toFixed(1)}%`;
                              textColor = 'rgba(16, 185, 129, 1)'; // Verde
                          } else {
                              const sobregiro = ppto > 0 ? percentage - 100 : 100;
                              porcentajeTexto = `Déficit ${sobregiro.toFixed(1)}%`;
                              textColor = 'rgba(239, 68, 68, 1)'; // Rojo
                          }
                          
                          const prefix = diferencia > 0 ? '+' : '';
                          const moneyStr = `${prefix}${new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0}).format(diferencia)}`;
                          
                          ctx.font = 'bold 11px "Outfit", sans-serif';
                          ctx.textAlign = 'center';
                          ctx.textBaseline = 'bottom';
                          
                          // Dibujar dinero arriba
                          ctx.fillStyle = '#cbd5e1';
                          ctx.fillText(moneyStr, datapoint.x, datapoint.y - 18);
                          
                          // Dibujar porcentaje con color dinamico
                          ctx.fillStyle = textColor;
                          ctx.fillText(porcentajeTexto, datapoint.x, datapoint.y - 6);
                      });
                      ctx.restore();
                  }
              };

              this.evolucionChart = new Chart(ctxEvo, {
                  type: 'bar',
                  data: {
                      labels: labels,
                      datasets: [
                          {
                              type: 'line',
                              label: 'Ejecución Mensual',
                              data: ejecs,
                              borderColor: 'rgba(16, 185, 129, 1)',
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              borderWidth: 3,
                              tension: 0.3,
                              fill: true,
                              pointRadius: pointSizes,
                              pointHoverRadius: 8,
                              pointBackgroundColor: pointColors,
                              pointBorderColor: pointColors,
                              order: 1
                          },
                          {
                              type: 'bar',
                              label: 'Presupuesto Asignado',
                              data: pptos,
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              borderColor: 'rgba(255, 255, 255, 0.1)',
                              borderWidth: 1,
                              borderRadius: 4,
                              order: 2
                          }
                      ]
                  },
                  plugins: [evoLabelsPlugin],
                  options: {
                      layout: {
                          padding: { top: 40 } // Espacio arriba para que quepa el texto de los puntos
                      },
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: { mode: 'index', intersect: false },
                      plugins: {
                          legend: { position: 'top', labels: { color: '#cbd5e1' } },
                          tooltip: {
                              callbacks: {
                                  label: (context) => {
                                      let value = context.raw as number;
                                      return ` ${context.dataset.label}: ${new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0}).format(value)}`;
                                  }
                              }
                          }
                      },
                      scales: {
                          x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                          y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#cbd5e1' }, beginAtZero: true }
                      }
                  }
              });
          }
      }
  }
}
