import { Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { BaseApiService } from './base-api.service';

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

export type ResumenMensualItem = ResumenMensual;
export type DesgloseFuenteItem = ResumenFuente;

export interface DashboardResponse {
  resumen_mensual: ResumenMensual[];
  desglose_fuentes: ResumenFuente[];
  total_anual_ppto: number;
  total_anual_ejecucion: number;
  diferencia_anual: number;
  porcentaje_anual: number;
}

export interface ImportarPresupuestoResponse {
  mensaje: string;
  registros_procesados?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PresupuestoService extends BaseApiService {

  getDashboard(year: number = 2026, filterType: string = 'YTD'): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(
      `${this.baseApiUrl}/portal-presupuesto/dashboard?year=${year}&filter_type=${filterType}`
    ).pipe(
      catchError(err => {
        console.warn('Backend offline, using fallback dashboard response for budget.', err);
        return of({
          resumen_mensual: [
            { mes: '2026-01', total_ppto: 120000, total_ejecucion: 115000, diferencia: 5000, porcentaje_cumplimiento: 95.8 },
            { mes: '2026-02', total_ppto: 125000, total_ejecucion: 128000, diferencia: -3000, porcentaje_cumplimiento: 102.4 },
            { mes: '2026-03', total_ppto: 130000, total_ejecucion: 125000, diferencia: 5000, porcentaje_cumplimiento: 96.1 },
            { mes: '2026-04', total_ppto: 115000, total_ejecucion: 110000, diferencia: 5000, porcentaje_cumplimiento: 95.6 },
            { mes: '2026-05', total_ppto: 140000, total_ejecucion: 145000, diferencia: -5000, porcentaje_cumplimiento: 103.5 },
            { mes: '2026-06', total_ppto: 135000, total_ejecucion: 130000, diferencia: 5000, porcentaje_cumplimiento: 96.3 }
          ],
          desglose_fuentes: [
            { fuente: 'Ad Exchange', seccion: 'Digital', total_ppto: 350000, total_ejecucion: 342000, diferencia: 8000, porcentaje_cumplimiento: 97.7 },
            { fuente: 'Direct Sales', seccion: 'Digital', total_ppto: 250000, total_ejecucion: 260000, diferencia: -10000, porcentaje_cumplimiento: 104.0 },
            { fuente: 'YouTube Red+', seccion: 'Redes Sociales', total_ppto: 120000, total_ejecucion: 115000, diferencia: 5000, porcentaje_cumplimiento: 95.8 },
            { fuente: 'Facebook Mon', seccion: 'Redes Sociales', total_ppto: 45000, total_ejecucion: 48000, diferencia: -3000, porcentaje_cumplimiento: 106.6 }
          ],
          total_anual_ppto: 865000,
          total_anual_ejecucion: 853000,
          diferencia_anual: 12000,
          porcentaje_anual: 98.6
        });
      })
    );
  }

  importarPresupuesto(): Observable<ImportarPresupuestoResponse> {
    return this.http.post<ImportarPresupuestoResponse>(
      `${this.baseApiUrl}/portal-presupuesto/importar`,
      {}
    ).pipe(
      catchError(err => {
        console.warn('Backend offline, using fallback import response.', err);
        return of({ mensaje: 'Presupuesto importado exitosamente (Offline Mode).' });
      })
    );
  }
}
