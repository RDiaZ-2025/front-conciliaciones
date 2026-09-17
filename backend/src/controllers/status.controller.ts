import { Request, Response } from 'express';
import { asyncHandler } from "../utils/asyncHandler";
import { PRODUCTION_STATUSES } from '../constants/status.constants';

export const getAllStatuses = asyncHandler(async (req: Request, res: Response) => {
  res.json(PRODUCTION_STATUSES);
});
