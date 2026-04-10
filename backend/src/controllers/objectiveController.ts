import { Request, Response } from 'express';
import { ObjectiveService } from '../services/objectiveService';
import { asyncHandler } from "../utils/asyncHandler";

export const getObjectives = asyncHandler(async (req: Request, res: Response) => {
    const objectiveService = new ObjectiveService();
    const objectives = await objectiveService.getObjectives();
    res.json(objectives);
});
