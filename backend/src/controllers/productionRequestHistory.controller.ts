import { Request, Response } from 'express';
import { ProductionRequestHistoryService } from '../services/productionRequestHistory.service';
import { asyncHandler } from "../utils/asyncHandler";

const historyService = new ProductionRequestHistoryService();

export const getProductionRequestHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const history = await historyService.getHistoryByRequestId(parseInt(id));
  res.status(200).json(history);
});
