import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { NocDashboardService, nocDashboardService } from '../services/noc_dashboard.service';

export class NocDashboardController {
  constructor(private dashboardService: NocDashboardService = nocDashboardService) {}

  getOverviewStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = await this.dashboardService.getOverviewStats(req.query);
    res.status(200).json(data);
  });

  getContentStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = await this.dashboardService.getContentStats(req.query);
    res.status(200).json(data);
  });

  getEntitiesStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = await this.dashboardService.getEntitiesStats(req.query);
    res.status(200).json(data);
  });

  getEntityDetail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const entity = req.query.entity as string | undefined;
    if (!entity) {
      res.status(400).json({ message: 'Parámetro entity es requerido' });
      return;
    }
    const data = await this.dashboardService.getEntityDetail(entity, req.query);
    if (!data) {
      res.status(404).json({ message: 'Entidad no encontrada' });
      return;
    }
    res.status(200).json(data);
  });

  getReachStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = await this.dashboardService.getReachStats(req.query);
    res.status(200).json(data);
  });

  getAudienceStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = await this.dashboardService.getAudienceStats(req.query);
    res.status(200).json(data);
  });

  getDashboardFilters = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = await this.dashboardService.getDashboardFilters();
    res.status(200).json(data);
  });

  importDashboardData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await this.dashboardService.importDashboardData();
    res.status(200).json(result);
  });
}
