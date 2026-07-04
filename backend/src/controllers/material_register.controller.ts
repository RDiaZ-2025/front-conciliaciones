import { Request, Response } from 'express';
import { MaterialRegisterService } from '../services/material_register.service';
import { asyncHandler } from "../utils/asyncHandler";

const materialRegisterService = new MaterialRegisterService();

export const addMaterialRegister = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { category, type, solution, jsonRequest } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    const newRegister = await materialRegisterService.create({
        productionRequestId: parseInt(id),
        category,
        type,
        solution,
        jsonRequest: typeof jsonRequest === 'string' ? jsonRequest : JSON.stringify(jsonRequest),
        createdBy: userId
    });
    res.status(201).json(newRegister);
});

export const getMaterialRegisters = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const registers = await materialRegisterService.findByProductionRequestId(parseInt(id));
    res.status(200).json(registers);
});
