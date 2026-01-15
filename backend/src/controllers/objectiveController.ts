import { Request, Response } from 'express';
import { AppDataSource } from '../config/typeorm.config';
import { Objective } from '../models/Objective';

export const getObjectives = async (req: Request, res: Response) => {
    try {
        const objectiveRepository = AppDataSource.getRepository(Objective);
        const objectives = await objectiveRepository.find();
        res.json(objectives);
    } catch (error) {
        console.error('Error retrieving objectives:', error);
        res.status(500).json({ message: 'Error retrieving objectives' });
    }
};
