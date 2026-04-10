import { Request, Response } from 'express';
import { AppDataSource } from '../config/typeorm.config';
import { Gender } from '../models/Gender';
import { AgeRange } from '../models/AgeRange';
import { SocioeconomicLevel } from '../models/SocioeconomicLevel';
import { asyncHandler } from "../utils/asyncHandler";

export const getGenders = asyncHandler(async (req: Request, res: Response) => {
const repo = AppDataSource.getRepository(Gender);
        const list = await repo.find();
        res.json(list);
});

export const getAgeRanges = asyncHandler(async (req: Request, res: Response) => {
const repo = AppDataSource.getRepository(AgeRange);
        const list = await repo.find();
        res.json(list);
});

export const getSocioeconomicLevels = asyncHandler(async (req: Request, res: Response) => {
const repo = AppDataSource.getRepository(SocioeconomicLevel);
        const list = await repo.find();
        res.json(list);
});
