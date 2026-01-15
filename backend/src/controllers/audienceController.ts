import { Request, Response } from 'express';
import { AppDataSource } from '../config/typeorm.config';
import { Gender } from '../models/Gender';
import { AgeRange } from '../models/AgeRange';
import { SocioeconomicLevel } from '../models/SocioeconomicLevel';

export const getGenders = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(Gender);
        const list = await repo.find();
        res.json(list);
    } catch (error) {
        console.error('Error retrieving genders:', error);
        res.status(500).json({ message: 'Error retrieving genders' });
    }
};

export const getAgeRanges = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(AgeRange);
        const list = await repo.find();
        res.json(list);
    } catch (error) {
        console.error('Error retrieving age ranges:', error);
        res.status(500).json({ message: 'Error retrieving age ranges' });
    }
};

export const getSocioeconomicLevels = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(SocioeconomicLevel);
        const list = await repo.find();
        res.json(list);
    } catch (error) {
        console.error('Error retrieving socioeconomic levels:', error);
        res.status(500).json({ message: 'Error retrieving socioeconomic levels' });
    }
};
