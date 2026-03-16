import { Request, Response } from 'express';
import { MaterialRegisterService } from '../services/materialRegister.service';
import { AppDataSource } from '../config/typeorm.config';
import { ProductionRequest } from '../models/ProductionRequest';

const materialRegisterService = new MaterialRegisterService();

export const addMaterialRegister = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { id } = req.params; // ProductionRequest ID
        const { category, type, solution, jsonRequest } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!AppDataSource.isInitialized) {
            return res.status(503).json({ success: false, message: 'Database not available' });
        }

        const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);
        const request = await productionRequestRepository.findOne({ where: { id: parseInt(id) } });

        if (!request) {
            return res.status(404).json({ message: 'Production request not found' });
        }

        const newRegister = await materialRegisterService.create({
            productionRequestId: parseInt(id),
            category,
            type,
            solution,
            jsonRequest: typeof jsonRequest === 'string' ? jsonRequest : JSON.stringify(jsonRequest),
            createdBy: userId
        });

        return res.status(201).json(newRegister);
    } catch (error) {
        console.error('Error adding material register:', error);
        return res.status(500).json({ message: 'Error adding material register', error });
    }
};

export const getMaterialRegisters = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { id } = req.params; // ProductionRequest ID

        if (!AppDataSource.isInitialized) {
            return res.status(503).json({ success: false, message: 'Database not available' });
        }

        const registers = await materialRegisterService.findByProductionRequestId(parseInt(id));
        return res.status(200).json(registers);
    } catch (error) {
        console.error('Error fetching material registers:', error);
        return res.status(500).json({ message: 'Error fetching material registers', error });
    }
};
