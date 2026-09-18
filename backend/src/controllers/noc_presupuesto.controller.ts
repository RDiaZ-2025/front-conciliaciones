import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { NocPresupuestoService, nocPresupuestoService } from '../services/noc_presupuesto.service';

export class NocPresupuestoController {
  constructor(private presupuestoService: NocPresupuestoService = nocPresupuestoService) {}

  getDashboardPresupuesto = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const year = Number(req.query.year || 2026);
    const filter_type = String(req.query.filter_type || 'TOTAL');
    const data = await this.presupuestoService.getDashboardPresupuesto(year, filter_type);
    res.status(200).json(data);
  });

  importarPresupuesto = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.presupuestoService.importarPresupuesto();
      res.status(200).json(data);
    } catch (e: any) {
      if (e.message?.includes('no encontrado')) {
        res.status(404).json({ message: e.message });
      } else if (e.message?.includes('formato válido')) {
        res.status(400).json({ message: e.message });
      } else {
        res.status(500).json({ message: `Error al importar excel: ${e.message}` });
      }
    }
  });
}
