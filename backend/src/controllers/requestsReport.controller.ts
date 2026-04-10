import { Request, Response } from 'express';
import { RequestsReportService } from '../services/requestsReport.service';
import { asyncHandler } from "../utils/asyncHandler";

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
}
