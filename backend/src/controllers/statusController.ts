import { Request, Response } from 'express';
import { AppDataSource } from '../config/typeorm.config';
import { Status } from '../models/Status';

export const getAllStatuses = async (req: Request, res: Response) => {
  try {
    const statusRepository = AppDataSource.getRepository(Status);
    const statuses = await statusRepository.find({
      order: {
        order: 'ASC'
      }
    });

    res.json(statuses);
  } catch (error) {
    console.error('Error fetching statuses:', error);
    res.status(500).json({ message: 'Error fetching statuses' });
  }
};
