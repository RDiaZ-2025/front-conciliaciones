import { Request, Response } from 'express';
import { AudienceService } from '../services/audienceService';
import { asyncHandler } from "../utils/asyncHandler";

export const getGenders = asyncHandler(async (req: Request, res: Response) => {
    const audienceService = new AudienceService();
    const list = await audienceService.getGenders();
    res.json(list);
});

export const getAgeRanges = asyncHandler(async (req: Request, res: Response) => {
    const audienceService = new AudienceService();
    const list = await audienceService.getAgeRanges();
    res.json(list);
});

export const getSocioeconomicLevels = asyncHandler(async (req: Request, res: Response) => {
    const audienceService = new AudienceService();
    const list = await audienceService.getSocioeconomicLevels();
    res.json(list);
});
