import { Request, Response } from 'express';
import { RequestsReportService } from '../services/requests_report.service';
import { asyncHandler } from "../utils/asyncHandler";
import { requestsAnalyticsService } from '../services/requests_analytics.service';

export class RequestsReportController {
  private reportService = new RequestsReportService();

  getDashboardStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const result = await this.reportService.getDashboardStats(userId);
    res.status(200).json(result);
  });

  getMyRequestsStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const result = await this.reportService.getMyRequestsStats(userId);
    res.status(200).json(result);
  });

  getRequestsAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const dateFrom = new Date(String(req.query.dateFrom || ''));
    const dateTo = new Date(String(req.query.dateTo || ''));
    const tzOffsetMinutes = Number(req.query.tz);
    if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime()) || dateFrom > dateTo || isNaN(tzOffsetMinutes)) {
      res.status(400).json({ message: 'Parámetros inválidos: se requieren dateFrom, dateTo (ISO) y tz' });
      return;
    }

    const scope = await requestsAnalyticsService.resolveScope(userId, req.user?.role ?? undefined);
    if (!scope) {
      res.status(403).json({ message: 'No tienes acceso al informe de solicitudes' });
      return;
    }

    const data = await requestsAnalyticsService.getAnalytics(scope, {
      dateFrom,
      dateTo,
      tzOffsetMinutes,
      formIds: this.parseIdList(req.query.formIds),
      workflowIds: this.parseIdList(req.query.workflowIds)
    });
    res.status(200).json({ success: true, data });
  });

  private parseIdList(value: unknown): number[] {
    if (!value) return [];
    const raw = Array.isArray(value) ? value.map(String) : String(value).split(',');
    return raw.map(v => Number(v.trim())).filter(n => Number.isInteger(n) && n > 0);
  }
}
