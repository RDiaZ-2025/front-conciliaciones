import { Request, Response } from 'express';
import { ProductionRequestHistoryService } from '../services/productionRequestHistoryService';
import { AppDataSource } from '../config/typeorm.config';

const historyService = new ProductionRequestHistoryService();

export const getProductionRequestHistory = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;

    if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible'
      });
    }

    const history = await historyService.getHistoryByRequestId(parseInt(id));
    
    return res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching production request history:', error);
    return res.status(500).json({ message: 'Error fetching production request history', error });
  }
};
