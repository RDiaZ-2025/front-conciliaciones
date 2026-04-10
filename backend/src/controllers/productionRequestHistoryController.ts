import { Request, Response } from 'express';
import { ProductionRequestHistoryService } from '../services/productionRequestHistoryService';
import { AppDataSource } from '../config/typeorm.config';
import { asyncHandler } from "../utils/asyncHandler";

const historyService = new ProductionRequestHistoryService();

export const getProductionRequestHistory = asyncHandler(async (req: Request, res: Response): Promise<Response | void> => {
const { id } = req.params;

    if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }

    const history = await historyService.getHistoryByRequestId(parseInt(id));
    
    return res.status(200).json(history);
});
