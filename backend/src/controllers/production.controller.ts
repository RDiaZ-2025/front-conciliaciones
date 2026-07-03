
import { Request, Response } from 'express';
import { ProductionService } from '../services/production.service';
import { asyncHandler } from "../utils/asyncHandler";

const productionService = new ProductionService();

export class ProductionController {
    getFormatTypes = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
        const formatTypes = await productionService.getFormatTypes();
        return res.json(formatTypes);
    });

    getRightsDurations = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
        const rightsDurations = await productionService.getRightsDurations();
        return res.json(rightsDurations);
    });

    getWorkflowStages = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
        const stages = await productionService.getWorkflowStages();
        return res.json(stages);
    });

    getRequestTypes = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
        const requestTypes = await productionService.getRequestTypes();
        return res.json(requestTypes);
    });
}

export const getAllProductionRequests = asyncHandler(async (req: Request, res: Response): Promise<Response | void> => {
    const userId = req.user?.userId;
    const hasManagementPermission = req.user?.permissions?.includes('production_management');
    const requests = await productionService.getAllProductionRequests(userId, hasManagementPermission, req.query.view as string | undefined);
    return res.status(200).json(requests);
});

export const getProducts = asyncHandler(async (req: Request, res: Response): Promise<Response | void> => {
    const products = await productionService.getProducts();
    return res.status(200).json(products);
});

export const getProductionRequestById = asyncHandler(async (req: Request, res: Response): Promise<Response | void> => {
    const { id } = req.params;
    const request = await productionService.getProductionRequestById(parseInt(id));
    return res.status(200).json(request);
});

export const createProductionRequest = asyncHandler(async (req: Request, res: Response): Promise<Response | void> => {
    const request = await productionService.createProductionRequest(req.body, req.user?.userId);
    return res.status(201).json(request);
});

export const updateProductionRequest = asyncHandler(async (req: Request, res: Response): Promise<Response | void> => {
    const { id } = req.params;
    const request = await productionService.updateProductionRequest(parseInt(id), req.body, req.user?.userId);
    return res.status(200).json(request);
});

export const updateProductionRequestPartial = asyncHandler(async (req: Request, res: Response): Promise<Response | void> => {
    const { id } = req.params;
    const request = await productionService.updateProductionRequestPartial(parseInt(id), req.body, req.user?.userId);
    return res.status(200).json(request);
});

export const moveProductionRequest = updateProductionRequestPartial;
export const updateStepGeneral = updateProductionRequestPartial;
export const updateStepCustomer = updateProductionRequestPartial;
export const updateStepCampaign = asyncHandler(async (req: Request, res: Response): Promise<Response | void> => {
    const { id } = req.params;
    const request = await productionService.updateStepCampaign(parseInt(id), req.body, req.user?.userId);
    return res.status(200).json(request);
});
export const updateStepAudience = updateProductionRequestPartial;
export const updateStepProduction = updateProductionRequestPartial;
export const updateMaterialData = updateProductionRequestPartial;
