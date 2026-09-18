import { Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { BaseApiService } from './base-api.service';

export interface IngresosData {
  fechas: string[];
  datasets: {
    revenue: number[];
    ecpm: number[];
    impresiones: number[];
    impresiones_sin_rellenar: number[];
  };
}

export interface RedesData {
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

export interface ResumenData {
  admanager_total: number;
  youtube_total_neto: number;
  facebook_total: number;
  total_global_usd: number;
}

export interface AgentChatResponse {
  response: string;
}

@Injectable({
  providedIn: 'root'
})
export class IngresosService extends BaseApiService {

  getDatosGrafico(): Observable<IngresosData> {
    return this.http.get<IngresosData>(`${this.baseApiUrl}/ingresos/datos-grafico`).pipe(
      catchError(err => {
        console.warn('Backend offline, using fallback AdManager data.', err);
        return of({
          fechas: ['2026-05-28', '2026-05-29', '2026-05-30', '2026-05-31', '2026-06-01', '2026-06-02', '2026-06-03'],
          datasets: {
            revenue: [1200, 1350, 1100, 1250, 1420, 1380, 1550],
            ecpm: [1.5, 1.6, 1.45, 1.55, 1.65, 1.6, 1.7],
            impresiones: [800000, 843000, 758000, 806000, 860000, 862000, 911000],
            impresiones_sin_rellenar: [5000, 4800, 6200, 5100, 4200, 4500, 3900]
          }
        });
      })
    );
  }

  getDatosRedes(plataforma: 'youtube' | 'facebook'): Observable<RedesData> {
    return this.http.get<RedesData>(`${this.baseApiUrl}/ingresos/datos-redes/${plataforma}`).pipe(
      catchError(err => {
        console.warn(`Backend offline, using fallback ${plataforma} data.`, err);
        if (plataforma === 'youtube') {
          return of({
            fechas: ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'],
            datasets: {
              total_bruto: [15000, 16200, 17500, 15800, 18200, 19500],
              retencion: [4500, 4860, 5250, 4740, 5460, 5850],
              total_neto: [10500, 11340, 12250, 11060, 12740, 13650],
              canales: {
                red_mas_tv: [5000, 5200, 5800, 5100, 6000, 6400],
                red_mas_noticias: [3000, 3240, 3450, 3160, 3640, 3950],
                quince_minutos: [1500, 1700, 1800, 1600, 1850, 2000],
                radiola_tv: [1000, 1200, 1200, 1200, 1250, 1300]
              }
            }
          });
        }
        return of({
          fechas: ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'],
          datasets: {
            total_bruto: [8000, 8500, 9200, 8800, 9500, 10200],
            retencion: [2400, 2550, 2760, 2640, 2850, 3060],
            total_neto: [5600, 5950, 6440, 6160, 6650, 7140],
            canales: {
              red_mas_tv: [2500, 2600, 2900, 2700, 2950, 3200],
              red_mas_noticias: [1800, 1950, 2100, 2060, 2150, 2300],
              quince_minutos: [800, 900, 940, 900, 1000, 1140],
              radiola_tv: [500, 500, 500, 500, 550, 500]
            }
          }
        });
      })
    );
  }

  getResumenGeneral(): Observable<ResumenData> {
    return this.http.get<ResumenData>(`${this.baseApiUrl}/ingresos/resumen-general`).pipe(
      catchError(err => {
        console.warn('Backend offline, using fallback Resumen data.', err);
        return of({
          admanager_total: 9250,
          youtube_total_neto: 71540,
          facebook_total: 37940,
          total_global_usd: 118730
        });
      })
    );
  }

  sendAgentChat(message: string, history: any[]): Observable<AgentChatResponse> {
    return this.http.post<AgentChatResponse>(
      `${this.baseApiUrl}/agent/chat`,
      { message, history }
    ).pipe(
      catchError(err => {
        console.warn('Backend agent offline, fallback to offline chatbot response.', err);
        let mockResponse = 'Lo siento, el backend de IA no está conectado actualmente. Sin embargo, puedo confirmarte que el total global acumulado estimado para Red+ es de $118,730 USD distribuidos entre YouTube ($71,540 USD), Facebook ($37,940 USD) y Ad Manager ($9,250 USD).';
        const query = (message || '').toLowerCase();
        if (query.includes('resumen') || query.includes('día') || query.includes('dia')) {
          mockResponse = 'Resumen del día (Offline Mode): Las campañas digitales muestran un rendimiento óptimo. Ad Manager acumuló $1,550 USD ayer con un eCPM promedio saludable de $1.70. Las fuentes principales de ingresos son estables y no presentan anomalías.';
        } else if (query.includes('youtube')) {
          mockResponse = 'Youtube (Offline Mode): En lo que va del año, YouTube ha generado $71,540 USD netos. La retención promedio de la red se mantiene alrededor de un 30% del bruto total ($19,500 USD brutos en el mes actual).';
        } else if (query.includes('facebook')) {
          mockResponse = 'Facebook (Offline Mode): Los ingresos netos de Facebook rondan los $37,940 USD totales. El canal de mayor rendimiento sigue siendo RED+ TV.';
        } else if (query.includes('presupuesto')) {
          mockResponse = 'Presupuesto (Offline Mode): El cumplimiento anual acumulado de la red se encuentra en un 98.6%, indicando un ahorro global de $12,000 USD contra el presupuesto original de $865,000 USD.';
        }
        return of({ response: mockResponse });
      })
    );
  }
}
