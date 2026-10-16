import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';
import { RequestBusinessStatus, RequestsAnalytics } from './requests-report.service';

export const REQUEST_STATUS_LABELS: Record<RequestBusinessStatus, string> = {
  in_progress: 'En curso',
  returned: 'Devuelta',
  completed: 'Finalizada',
  deleted: 'Eliminada'
};

/**
 * Genera el archivo Excel del Informe de Solicitudes con una hoja por bloque de información.
 */
@Injectable({
  providedIn: 'root'
})
export class RequestsReportExportService {
  async exportToExcel(data: RequestsAnalytics, periodLabel: string): Promise<void> {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    const s = data.summary;

    this.addSheet(workbook, 'Resumen', ['Indicador', 'Valor'], [
      ['Periodo', periodLabel],
      ['Solicitudes creadas', s.total],
      ['En curso', s.inProgress],
      ['Devueltas para corrección', s.returned],
      ['Finalizadas', s.completed],
      ['Eliminadas', s.deleted],
      ['Tasa de finalización (%)', s.completionRate ?? ''],
      ['Tasa de devolución de flujos (%)', s.returnRate ?? ''],
      ['Tiempo promedio de ciclo (días)', s.avgCycleDays ?? ''],
      ['Tareas pendientes actuales', s.pendingTasks],
      ['Antigüedad promedio de tareas pendientes (días)', s.avgPendingAgeDays ?? ''],
      ['Tarea pendiente más antigua (días)', s.oldestPendingDays ?? '']
    ]);

    this.addSheet(workbook, 'Solicitudes',
      ['Consecutivo', 'Tipo de solicitud', 'Solicitante', 'Fecha de creación', 'Estado', 'Áreas', 'Días abierta', 'Días de ciclo', 'Fecha de finalización'],
      data.requests.map(r => [
        r.consecutive || '',
        r.formName,
        r.requesterName,
        new Date(r.createdAt),
        REQUEST_STATUS_LABELS[r.status],
        r.areas.map(a => `${a.name} #${a.id} (${REQUEST_STATUS_LABELS[a.status]})`).join(', '),
        r.ageDays ?? '',
        r.cycleDays ?? '',
        r.completedAt ? new Date(r.completedAt) : ''
      ]));

    this.addSheet(workbook, 'Tareas pendientes',
      ['ID Solicitud', 'Consecutivo', 'Tipo de solicitud', 'Área', 'Etapa', 'Responsable', 'Equipo', 'Asignada desde', 'Días en espera'],
      data.pendingTasks.map(t => [t.submissionId, t.consecutive || '', t.formName, t.area, t.stageName, t.assigneeName, t.teamName, new Date(t.createdAt), t.ageDays]));

    this.addSheet(workbook, 'Carga por responsable',
      ['Responsable', 'Equipo', 'Tareas pendientes', 'Antigüedad promedio (días)', 'Más antigua (días)'],
      data.workload.map(w => [w.userName, w.teamName, w.pending, w.avgAgeDays ?? '', w.maxAgeDays]));

    this.addSheet(workbook, 'Por área',
      ['Área', 'En curso', 'Devueltas', 'Finalizadas', 'Total'],
      data.byArea.map(a => [a.area, a.inProgress, a.returned, a.completed, a.total]));

    this.addSheet(workbook, 'Tiempos por etapa',
      ['Etapa', 'Tiempo promedio (horas)', 'Tareas resueltas'],
      data.stageTimes.map(t => [t.stage, t.avgHours, t.count]));

    this.addSheet(workbook, 'Comerciales',
      ['Solicitante', 'Creadas', 'Finalizadas', 'Abiertas'],
      data.topRequesters.map(r => [r.name, r.created, r.completed, r.inProgress]));

    const buffer = await workbook.xlsx.writeBuffer();
    const fileDate = new Date().toISOString().slice(0, 10);
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `informe-solicitudes-${fileDate}.xlsx`);
  }

  private addSheet(workbook: any, name: string, headers: string[], rows: any[][]) {
    const sheet = workbook.addWorksheet(name);
    sheet.addRow(headers);
    rows.forEach(row => sheet.addRow(row));
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEE3829' } };
    sheet.columns.forEach((column: any, index: number) => {
      const maxLength = Math.max(headers[index].length, ...rows.map(r => String(r[index] instanceof Date ? 'dd/mm/aaaa hh:mm' : r[index] ?? '').length));
      column.width = Math.min(Math.max(maxLength + 2, 12), 60);
      if (rows.some(r => r[index] instanceof Date)) column.numFmt = 'dd/mm/yyyy hh:mm';
    });
  }
}
