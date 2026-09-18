import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { NocIngresosService, nocIngresosService } from '../services/noc_ingresos.service';

export class NocIngresosController {
  constructor(private ingresosService: NocIngresosService = nocIngresosService) {}

  getIngresosGrafico = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const limite = Number(req.query.limite || 2000);
    const data = await this.ingresosService.getIngresosGrafico(limite);
    res.status(200).json(data);
  });

  getIngresosRedes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { plataforma } = req.params;
    const limite = Number(req.query.limite || 200);
    const data = await this.ingresosService.getIngresosRedes(plataforma, limite);
    res.status(200).json(data);
  });

  getResumenGeneral = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = await this.ingresosService.getResumenGeneral();
    res.status(200).json(data);
  });
}
