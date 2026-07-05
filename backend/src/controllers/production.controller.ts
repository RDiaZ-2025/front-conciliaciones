
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

export const getFormFields = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const fields = await productionService.getFormFields(parseInt(id));
    return res.json(fields);
});

export const createSubmission = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const { formId, values } = req.body;
    const requesterUserId = req.user?.userId;
    if (!requesterUserId) return res.status(401).json({ message: 'Usuario no autenticado' });
    const submission = await productionService.createSubmission(parseInt(formId), requesterUserId, values);
    return res.status(201).json(submission);
});

export const getSubmissions = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const requesterUserId = req.user?.userId;
    if (!requesterUserId) return res.status(401).json({ message: 'Usuario no autenticado' });
    const submissions = await productionService.getSubmissions(requesterUserId);
    return res.json(submissions);
});

export const getSubmissionDetails = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const { submissionId } = req.params;
    const result = await productionService.getSubmissionDetails(parseInt(submissionId));
    return res.json(result);
});

export const adminGetForms = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const forms = await productionService.adminGetForms();
    return res.json(forms);
});

export const adminCreateForm = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const form = await productionService.adminCreateForm(req.body);
    return res.status(201).json(form);
});

export const adminUpdateForm = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const form = await productionService.adminUpdateForm(parseInt(id), req.body);
    return res.json(form);
});

export const adminDeleteForm = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const form = await productionService.adminDeleteForm(parseInt(id));
    return res.json(form);
});

export const adminSaveFields = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const fields = await productionService.adminSaveFields(parseInt(id), req.body);
    return res.json(fields);
});

export const adminGetStages = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const stages = await productionService.adminGetStages(parseInt(id));
    return res.json(stages);
});

export const adminSaveStages = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const stages = await productionService.adminSaveStages(parseInt(id), req.body);
    return res.json(stages);
});

export const getPendingApprovals = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Usuario no autenticado' });
    const approvals = await productionService.getPendingApprovals(userId);
    return res.json(approvals);
});

export const actionApproval = asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const { stateId } = req.params;
    const { action, notes, formValues, consecutive } = req.body;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Usuario no autenticado' });
    const result = await productionService.actionApproval(parseInt(stateId), userId, action, notes, formValues, consecutive);
    return res.json(result);
});
