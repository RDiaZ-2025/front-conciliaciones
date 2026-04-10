import { Request, Response } from 'express';
import { AppDataSource } from '../config/typeorm.config';
import { Objective } from '../models/Objective';
import { asyncHandler } from "../utils/asyncHandler";

export const getObjectives = asyncHandler(async (req: Request, res: Response) => {
const objectiveRepository = AppDataSource.getRepository(Objective);
        const objectives = await objectiveRepository.find();
        res.json(objectives);
});
