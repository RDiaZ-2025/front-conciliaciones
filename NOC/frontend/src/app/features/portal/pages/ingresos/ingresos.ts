import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';

import { FormsModule } from '@angular/forms';

interface IngresosData {
  fechas: string[];
  datasets: {
    revenue: number[];
    ecpm: number[];
    impresiones: number[];
    impresiones_sin_rellenar: number[];
  };
}

interface RedesData {
  fechas: string[];
  datasets: {
    total_bruto: number[];
    retencion: number[];
    total_neto: number[];
    canales: {
      red_mas_tv: number[];
      red_mas_noticias: number[];
      quince_minutos: number[];
      radiola_tv: number[];
    };
  };
}

interface ResumenData {
    admanager_total: number;
    youtube_total_neto: number;
    facebook_total: number;
    total_global_usd: number;
}

@Component({
  selector: 'app-ingresos',
  imports: [CommonModule, FormsModule],
  templateUrl: './ingresos.html',
  styleUrl: './ingresos.scss',
  standalone: true
})
export class Ingresos implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('tradingChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  private apiUrl = 'http://localhost:8000';
  private chart: Chart | null = null;
  
  // Data Structure
  activeTab: 'admanager' | 'youtube' | 'facebook' | 'chat' = 'chat';
  rawDataAdmanager: IngresosData | null = null;
  rawDataYoutube: RedesData | null = null;
  rawDataFacebook: RedesData | null = null;
  resumenData: ResumenData | null = null;
  
  isLoading: boolean = true;
  hasError: boolean = false;
  errorMessage: string = '';
  
  // General KPIs (Active)
  kpiFilter: '7D' | '30D' | 'TOTAL' | 'CUSTOM' | 'YTD' = 'YTD';
  channelFilter: 'TOTAL' | 'RED+ TV' | 'RED+NOTICIAS' | '15 MINUTOS' | 'RADIOLATV' = 'TOTAL';
  customStartDate: string = '';
  customEndDate: string = '';
  
  totalRevenue: number = 0; // Se usa para Total Neto en Redes
  avgECPM: number = 0;      // En Redes será Retención
  totalImpressions: number = 0; // En redes será Total Bruto
  unfilledImpressions: number = 0; // Oculto o usado en GAM
  
  // Chat state
  chatMessages: {role: 'ai' | 'user', text: string}[] = [];
  chatInput: string = '';
  isChatLoading: boolean = false;
  chatHistory: {role: string, content: string}[] = [];

  quickSuggestions: string[] = [
    '¿Dame un resumen del día?',
    '¿Cómo van los ingresos de YouTube?',
    '¿Cómo está el presupuesto?',
    '¿Cuánto ingresó Ad Manager este mes?',
  ];

  // Chart calculation caches
  avgRevenueCache: number = 0;
  
  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Inicia requerimiento de datos de inmediato al entrar
    this.cargarDatos();
  }

  ngAfterViewInit(): void {
  }
  
  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  cargarDatos(isSilent: boolean = false): void {
    if (!isSilent) {
        this.isLoading = true;
    }
    this.hasError = false;
    
    // Multiple API calls logic
    const reqs = 4;
    let completed = 0;
    
    const checkComplete = () => {
        completed++;
        if (completed === reqs) {
            if (!isSilent) this.isLoading = false;
            this.calcularKPIs();
            this.cdr.detectChanges();
            setTimeout(() => this.renderizarGrafico(), 200);

            // Mensaje de bienvenida del agente
            if (this.chatMessages.length === 0) {
                this.chatMessages.push({
                    role: 'ai',
                    text: `¡Hola! Soy el Asistente Financiero de RED+ 📊\n\nEstoy conectado a la base de datos en tiempo real. Puedo ayudarte con preguntas sobre ingresos de Ad Manager, YouTube, Facebook y el estado del presupuesto.\n\nPrueba con alguna de las sugerencias de abajo o hazme cualquier pregunta.`,
                });
            }
        }
    };
    
    const errorHandler = (err: any) => {
        console.error('Error al cargar datos:', err);
        if (!isSilent && !this.hasError) {
          this.isLoading = false;
          this.hasError = true;
          if (err.status === 403) {
              this.errorMessage = 'Módulo protegido: No tienes permisos para visualizar los ingresos.';
          } else {
              this.errorMessage = 'No se pudo conectar con el servidor para obtener los datos.';
          }
        }
        checkComplete();
    };

    // 1. AdManager
    this.http.get<IngresosData>(`${this.apiUrl}/ingresos/datos-grafico`)
      .subscribe({ next: (data) => { this.rawDataAdmanager = data; checkComplete(); }, error: errorHandler });
      
    // 2. Youtube
    this.http.get<RedesData>(`${this.apiUrl}/ingresos/datos-redes/youtube`)
      .subscribe({ next: (data) => { this.rawDataYoutube = data; checkComplete(); }, error: errorHandler });

    // 3. Facebook
    this.http.get<RedesData>(`${this.apiUrl}/ingresos/datos-redes/facebook`)
      .subscribe({ next: (data) => { this.rawDataFacebook = data; checkComplete(); }, error: errorHandler });
      
    // 4. Resumen Chat
    this.http.get<ResumenData>(`${this.apiUrl}/ingresos/resumen-general`)
      .subscribe({ next: (data) => { this.resumenData = data; checkComplete(); }, error: errorHandler });
  }

  setTab(tab: 'admanager' | 'youtube' | 'facebook' | 'chat') {
      this.activeTab = tab;
      this.channelFilter = 'TOTAL'; // reset filter entirely
      this.calcularKPIs();
      this.cdr.detectChanges();
      if (tab !== 'chat') {
          setTimeout(() => this.renderizarGrafico(), 200);
      }
  }

  setKpiFilter(filter: '7D' | '30D' | 'TOTAL' | 'CUSTOM' | 'YTD') {
      this.kpiFilter = filter;
      if (filter !== 'CUSTOM') {
         this.customStartDate = '';
         this.customEndDate = '';
      }
      this.calcularKPIs();
      if(this.activeTab !== 'chat') {
          this.renderizarGrafico();
      }
  }

  aplicarFiltroFechas() {
      if(this.customStartDate && this.customEndDate) {
          this.kpiFilter = 'CUSTOM';
          this.calcularKPIs();
          if(this.activeTab !== 'chat') {
              this.renderizarGrafico();
          }
      }
  }

  setChannelFilter(filter: 'TOTAL' | 'RED+ TV' | 'RED+NOTICIAS' | '15 MINUTOS' | 'RADIOLATV') {
      this.channelFilter = filter;
      this.calcularKPIs();
      if(this.activeTab !== 'chat') {
          this.renderizarGrafico();
      }
  }

  enviarMensajeChat(textoDirecto?: string) {
      const texto = textoDirecto ?? this.chatInput;
      if (!texto.trim() || this.isChatLoading) return;

      this.chatMessages.push({ role: 'user', text: texto });
      this.chatHistory.push({ role: 'user', content: texto });
      this.chatInput = '';
      this.isChatLoading = true;

      // Scroll al final
      setTimeout(() => this.scrollChatToBottom(), 50);

      this.http.post<{response: string}>(
          `${this.apiUrl}/api/agent/chat`,
          { message: texto, history: this.chatHistory.slice(-10) }
      ).subscribe({
          next: (res) => {
              this.chatMessages.push({ role: 'ai', text: res.response });
              this.chatHistory.push({ role: 'assistant', content: res.response });
              this.isChatLoading = false;
              this.cdr.detectChanges();
              setTimeout(() => this.scrollChatToBottom(), 50);
          },
          error: (err) => {
              this.chatMessages.push({
                  role: 'ai',
                  text: 'Lo siento, ocurrió un error al procesar tu pregunta. Por favor intenta de nuevo.',
              });
              this.isChatLoading = false;
              this.cdr.detectChanges();
          }
      });
  }

  private scrollChatToBottom(): void {
      const chatContainer = document.querySelector('.chat-messages-container');
      if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
      }
  }

  get isYoutubeOrFacebook() {
      return this.activeTab === 'youtube' || this.activeTab === 'facebook';
  }

  private getFilteredIndices(fechas: string[]): {start: number, end: number} {
      if (this.kpiFilter === 'CUSTOM' && this.customStartDate && this.customEndDate) {
          let start = fechas.findIndex(f => f >= this.customStartDate);
          if (start === -1) start = 0;
          let end = fechas.length;
          for(let i=0; i<fechas.length; i++) {
             if (fechas[i] > this.customEndDate) { end = i; break; }
          }
          return {start, end};
      } else if (this.kpiFilter === 'YTD') {
          const currentYear = new Date().getFullYear().toString();
          let start = fechas.findIndex(f => f.startsWith(currentYear));
          if (start === -1) start = fechas.length; // No data for current year
          return {start, end: fechas.length};
      } else {
          let limit = fechas.length;
          if (this.activeTab === 'admanager') {
              if (this.kpiFilter === '7D') limit = Math.min(limit, 30); // Ultimo mes
              if (this.kpiFilter === '30D') limit = Math.min(limit, 90); // 3 meses
          } else {
              if (this.kpiFilter === '7D') limit = Math.min(limit, 1); // Ultimo mes
              if (this.kpiFilter === '30D') limit = Math.min(limit, 3); // 3 meses
          }
          return {start: fechas.length - Math.max(limit, 0), end: fechas.length};
      }
  }

  private calcularKPIs(): void {
    if (this.activeTab === 'admanager' && this.rawDataAdmanager) {
        const { start, end } = this.getFilteredIndices(this.rawDataAdmanager.fechas);
        
        const revs = this.rawDataAdmanager.datasets.revenue.slice(start, end);
        const ecpms = this.rawDataAdmanager.datasets.ecpm.slice(start, end);
        const imps = this.rawDataAdmanager.datasets.impresiones.slice(start, end);
        const unfilled = this.rawDataAdmanager.datasets.impresiones_sin_rellenar ? this.rawDataAdmanager.datasets.impresiones_sin_rellenar.slice(start, end) : [];
        
        this.totalRevenue = revs.reduce((a, b) => a + b, 0);
        this.totalImpressions = imps.reduce((a, b) => a + b, 0);
        this.unfilledImpressions = unfilled.length ? unfilled.reduce((a, b) => a + b, 0) : 0;
        this.avgECPM = ecpms.length ? ecpms.reduce((a, b) => a + b, 0) / ecpms.length : 0;
    } else if (this.isYoutubeOrFacebook) {
        const data = this.activeTab === 'youtube' ? this.rawDataYoutube : this.rawDataFacebook;
        if (!data || !data.fechas.length) return;
        
        const { start, end } = this.getFilteredIndices(data.fechas);
        
        let netoArray = data.datasets.total_neto;
        let brutoArray = data.datasets.total_bruto;
        let retencionArray = data.datasets.retencion;
        
        if (this.channelFilter !== 'TOTAL') {
             let channelData: number[] = [];
             if (this.channelFilter === 'RED+ TV') channelData = data.datasets.canales.red_mas_tv;
             if (this.channelFilter === 'RED+NOTICIAS') channelData = data.datasets.canales.red_mas_noticias;
             if (this.channelFilter === '15 MINUTOS') channelData = data.datasets.canales.quince_minutos;
             if (this.channelFilter === 'RADIOLATV') channelData = data.datasets.canales.radiola_tv;
             
             netoArray = channelData;
             brutoArray = channelData;
             retencionArray = Array(channelData.length).fill(0);
        }
        
        const bruto = brutoArray.slice(start, end);
        const retencion = retencionArray.slice(start, end);
        const neto = netoArray.slice(start, end);
        
        this.totalRevenue = neto.reduce((a, b) => a + b, 0);
        this.avgECPM = retencion.reduce((a, b) => a + b, 0); 
        this.totalImpressions = bruto.reduce((a, b) => a + b, 0);
        this.unfilledImpressions = 0;
    }
  }

  private renderizarGrafico(): void {
    if (this.activeTab === 'chat') return;
      
    if (this.chart) {
      this.chart.destroy();
    }
    
    if (!this.chartCanvas || !this.chartCanvas.nativeElement) {
      return; 
    }
    
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    if (this.activeTab === 'admanager') {
        this.renderAdmanagerChart(ctx);
    } else {
        this.renderRedesChart(ctx);
    }
  }
  
  private renderAdmanagerChart(ctx: any) {
    if (!this.rawDataAdmanager || !this.rawDataAdmanager.fechas.length) return;
    const { start, end } = this.getFilteredIndices(this.rawDataAdmanager.fechas);
    
    const displayLimit = end - start;
    const chartLabels = this.rawDataAdmanager.fechas.slice(start, end);
    const chartRevs = this.rawDataAdmanager.datasets.revenue.slice(start, end);
    const chartECPMs = this.rawDataAdmanager.datasets.ecpm.slice(start, end);
    
    const avgRevVisual = chartRevs.reduce((a, b) => a + b, 0) / (chartRevs.length || 1);
    const avgLineArray = Array(displayLimit).fill(avgRevVisual);
    
    const gradRevenue = ctx.createLinearGradient(0, 0, 0, 400);
    gradRevenue.addColorStop(0, 'rgba(46, 213, 115, 0.4)');
    gradRevenue.addColorStop(1, 'rgba(46, 213, 115, 0.0)');
    
    const gradECPM = ctx.createLinearGradient(0, 0, 0, 400);
    gradECPM.addColorStop(0, 'rgba(255, 165, 2, 0.4)');
    gradECPM.addColorStop(1, 'rgba(255, 165, 2, 0.0)');

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: 'Ad Exchange Revenue ($)',
            data: chartRevs,
            borderColor: '#2ed573',
            backgroundColor: gradRevenue,
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 6,
            yAxisID: 'y',
            order: 2
          },
          {
            label: 'eCPM Promedio ($)',
            data: chartECPMs,
            borderColor: '#ffa502',
            backgroundColor: gradECPM,
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 6,
            yAxisID: 'y1',
            order: 3
          },
          {
            label: 'Promedio de Ingresos ($)',
            data: avgLineArray,
            borderColor: 'rgba(255, 255, 255, 0.4)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            yAxisID: 'y',
            order: 1
          }
        ]
      },
      options: this.getChartOptions('Ingresos (USD)', 'eCPM (USD)')
    });
  }
  
  private renderRedesChart(ctx: any) {
    const data = this.activeTab === 'youtube' ? this.rawDataYoutube : this.rawDataFacebook;
    if (!data || !data.fechas.length) return;
    
    const { start, end } = this.getFilteredIndices(data.fechas);
    const chartLabels = data.fechas.slice(start, end);
    
    let netoArray = data.datasets.total_neto;
    let brutoArray = data.datasets.total_bruto;
    if (this.channelFilter !== 'TOTAL') {
         if (this.channelFilter === 'RED+ TV') netoArray = data.datasets.canales.red_mas_tv;
         if (this.channelFilter === 'RED+NOTICIAS') netoArray = data.datasets.canales.red_mas_noticias;
         if (this.channelFilter === '15 MINUTOS') netoArray = data.datasets.canales.quince_minutos;
         if (this.channelFilter === 'RADIOLATV') netoArray = data.datasets.canales.radiola_tv;
         brutoArray = netoArray;
    }

    const chartNeto = netoArray.slice(start, end);
    const chartBruto = brutoArray.slice(start, end);
    
    const gradNeto = ctx.createLinearGradient(0, 0, 0, 400);
    const baseColor = this.activeTab === 'youtube' ? '255, 71, 87' : '30, 144, 255';
    const secondaryColor = '46, 213, 115';
    
    gradNeto.addColorStop(0, `rgba(${baseColor}, 0.6)`);
    gradNeto.addColorStop(1, `rgba(${baseColor}, 0.0)`);
    
    const datasetsList: any[] = [
        {
          label: this.activeTab === 'facebook' || this.channelFilter !== 'TOTAL' ? 'Ingreso Generado ($)' : 'Total Neto ($)',
          data: chartNeto,
          backgroundColor: `rgba(${baseColor}, 0.8)`,
          borderRadius: 8,
          yAxisID: 'y'
        }
    ];
    
    // Only show "Total Bruto" line for Youtube globally, not for Facebook or individual channels (where bruto = neto anyway)
    if (this.activeTab === 'youtube' && this.channelFilter === 'TOTAL') {
        datasetsList.push({
          label: 'Total Bruto ($)',
          type: 'line',
          data: chartBruto,
          borderColor: `rgba(${secondaryColor}, 1)`,
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.1,
          fill: false,
          yAxisID: 'y'
        });
    }

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartLabels,
        datasets: datasetsList
      },
      options: this.getChartOptions(this.activeTab === 'facebook' ? 'Ingresos (USD)' : 'Ingresos Neto y Bruto (USD)')
    });
  }
  
  private getChartOptions(leftTitle: string, rightTitle: string = '') {
      return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index' as const,
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#cbd5e1',
              font: {
                family: "'Outfit', 'Inter', sans-serif"
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#ffffff',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 12,
            titleFont: { size: 14, family: "'Outfit', sans-serif" },
            bodyFont: { size: 13, family: "'Outfit', sans-serif" },
            displayColors: true
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', maxTicksLimit: 15 }
          },
          y: {
            type: 'linear' as const,
            display: true,
            position: 'left' as const,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            title: { display: true, text: leftTitle, color: '#94a3b8' },
            ticks: { color: '#2ed573', callback: (val: any) => '$' + val }
          },
          ...(rightTitle ? {
             y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                grid: { drawOnChartArea: false },
                title: { display: true, text: rightTitle, color: '#94a3b8' },
                ticks: { color: '#ffa502', callback: (val: any) => '$' + val }
              }
          } : {})
        }
      };
  }
}

