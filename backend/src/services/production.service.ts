import { ProductionRequest, Product, User, FormatType, RightsDuration, Team, ProductionRequestType } from "../models";
import { AppDataSource } from "../config/typeorm.config";
import { NotificationService } from './notification.service';
import { ProductionRequestHistoryService } from './production_request_history.service';
import { AuthService } from './auth.service';
import { WorkflowService } from './workflow.service';
import { Not, In } from "typeorm";
import { WORKFLOW_STAGES } from "../constants/workflow";
import { ProductionRequestDTO } from '../types';
import { CustomerData } from '../models/CustomerData';
import { AudienceData } from '../models/AudienceData';
import { CampaignDetail } from '../models/CampaignDetail';
import { ProductionInfo } from '../models/ProductionInfo';
import { DeepPartial } from 'typeorm';

const authService = new AuthService();
const workflowService = new WorkflowService();
const notificationService = new NotificationService();
const historyService = new ProductionRequestHistoryService();
const performSmartAssignment = async (department: string): Promise<{ assignedUserId: number, userName: string, activeRequestsCount: number } | null> => {
    try {
        const teamRepository = AppDataSource.getRepository(Team);
        const team = await teamRepository.findOne({ where: { name: department } });

        if (team) {
            const userRepository = AppDataSource.getRepository(User);
            const users = await userRepository.find({ where: { teamId: team.id, status: 1 } });

            if (users && users.length > 0) {
                const productionRequestRepository = AppDataSource.getRepository(ProductionRequest);

                const userWorkloads = await Promise.all(users.map(async (user) => {
                    const activeRequestsCount = await productionRequestRepository.count({
                        where: {
                            assignedUserId: user.id,
                            status: Not(In(['completed', 'cancelled']))
                        }
                    });
                    return { user, count: activeRequestsCount };
                }));

                userWorkloads.sort((a, b) => a.count - b.count);

                const minWorkload = userWorkloads[0].count;
                const candidates = userWorkloads.filter(uw => uw.count === minWorkload);

                const randomIndex = Math.floor(Math.random() * candidates.length);
                const selectedCandidate = candidates[randomIndex];

                return {
                    assignedUserId: selectedCandidate.user.id,
                    userName: selectedCandidate.user.name,
                    activeRequestsCount: selectedCandidate.count
                };
            }
        }
        return null;
    } catch (error) {
        console.error('Error in smart assignment:', error);
        return null;
    }
};

export class ProductionService {
    async getFormatTypes() {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        return await AppDataSource.getRepository(FormatType).find();
    }

    async getRightsDurations() {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        return await AppDataSource.getRepository(RightsDuration).find();
    }

    async getWorkflowStages() {
        return WORKFLOW_STAGES;
    }

    async getAllProductionRequests(userId: number | undefined, hasManagementPermission: boolean | undefined, view: string | undefined) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        const query = AppDataSource.getRepository(ProductionRequest).createQueryBuilder('request')
            .leftJoinAndSelect('request.customerData', 'customerData')
            .leftJoinAndSelect('request.assignedUser', 'assignedUser')
            .leftJoinAndSelect('request.materialRegisters', 'materialRegisters')
            .orderBy('request.requestDate', 'DESC');

        let filterByAssignedUser = true;
        if (hasManagementPermission && view === 'all') filterByAssignedUser = false;
        if (filterByAssignedUser) query.where('request.assignedUserId = :userId', { userId });
        if (!hasManagementPermission) query.andWhere('request.status NOT IN (:...closedStatuses)', { closedStatuses: ['completed', 'cancelled'] });

        return await query.getMany();
    }

    async getProducts() {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        return await AppDataSource.getRepository(Product).find();
    }

    async getRequestTypes() {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        return await AppDataSource.getRepository(ProductionRequestType).find();
    }

    async getProductionRequestById(id: number) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        const request = await AppDataSource.getRepository(ProductionRequest).findOne({
            where: { id },
            relations: [
                'customerData', 'audienceData', 'audienceData.gender', 'audienceData.ageRange',
                'audienceData.socioEconomicLevel', 'campaignDetail', 'campaignDetail.objective',
                'campaignDetail.campaignProducts', 'campaignDetail.campaignProducts.product',
                'productionInfo', 'productionInfo.formatType', 'productionInfo.rightsDuration',
                'assignedUser', 'materialRegisters', 'materialRegisters.creator'
            ]
        });
        if (!request) throw new Error('Production request not found');
        return request;
    }

    async createProductionRequest(data: ProductionRequestDTO, userId: number | undefined) {
        let { name, department, assignedUserId, deliveryDate, observations, status, stage, customerData, audienceData, campaignDetail, productionInfo, unitAssigned } = data;
        let userCreatorId: number | null = null;

        if (userId) {
            const currentUser = await AppDataSource.getRepository(User).findOne({ where: { id: userId } });
            if (currentUser) {
                userCreatorId = currentUser.id;
                const userTeams = await authService.getUserTeams(currentUser.id);
                if (department && userTeams.length > 0 && !userTeams.includes(department)) {
                    department = userTeams[0];
                }
            }
        }

        if (!name || !department) throw new Error('Missing required fields');

        let assignmentMethod = 'Manual';
        if (department && !assignedUserId) {
            const assignment = await performSmartAssignment(department);
            if (assignment) {
                assignedUserId = assignment.assignedUserId;
                assignmentMethod = 'Smart Workload Distribution';
            }
        }

        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');

        let finalStatus = status || stage || 'quotation';
        const tempRequest = new ProductionRequest();
        tempRequest.status = finalStatus === 'quotation' ? '' : 'quotation';
        tempRequest.department = department || '';
        tempRequest.assignedUserId = assignedUserId || null;
        tempRequest.userCreatorId = userCreatorId || null;

        const budgetValue = campaignDetail?.budget ? parseInt(String(campaignDetail.budget).replace(/[^0-9]/g, '')) : 0;
        if (finalStatus === 'quotation' && budgetValue > 0) tempRequest.status = 'quotation';

        const rulesResult = await workflowService.advanceStage(tempRequest, { budget: budgetValue });
        if (rulesResult.newStage) finalStatus = rulesResult.newStage;
        if (rulesResult.assignmentMethod !== 'Manual') {
            assignmentMethod = rulesResult.assignmentMethod;
            department = tempRequest.department || undefined;
            assignedUserId = tempRequest.assignedUserId || undefined;
        }

        if (campaignDetail && campaignDetail.budget !== undefined && campaignDetail.budget !== null) {
            campaignDetail.budget = String(campaignDetail.budget);
            campaignDetail.budget = String(campaignDetail.budget);
            campaignDetail.budget = String(campaignDetail.budget);
        }

        const isEmptyObject = (obj: Record<string, unknown> | undefined) => !obj || Object.values(obj).every(val => val === null || val === undefined || val === '' || val === false || (Array.isArray(val) && val.length === 0));

        const repo = AppDataSource.getRepository(ProductionRequest);
        const newRequest = repo.create({
            ...({
                name, requestDate: new Date(), department, userCreatorId, assignedUserId,
                deliveryDate: deliveryDate ? new Date(deliveryDate) : null, observations, status: finalStatus, unitAssigned,
                customerData: isEmptyObject(customerData) ? undefined : (customerData as unknown as CustomerData),
                audienceData: isEmptyObject(audienceData) ? undefined : (audienceData as unknown as AudienceData),
                campaignDetail: isEmptyObject(campaignDetail) ? undefined : (campaignDetail as unknown as CampaignDetail),
                productionInfo: isEmptyObject(productionInfo) ? undefined : (productionInfo as unknown as ProductionInfo)
            } as unknown as DeepPartial<ProductionRequest>)
        });

        const savedRequest = await repo.save(newRequest);

        if (userId) {
            await historyService.logChange(savedRequest.id, 'ProductionRequest', null, 'Created', userId, 'create');
            if (assignmentMethod !== 'Manual' && assignedUserId) {
                await historyService.logChange(savedRequest.id, 'AssignmentMethod', null, `${assignmentMethod}: Auto-assigned to user ID ${assignedUserId}`, userId, 'update');
            }
        }

        if (assignedUserId) {
            try {
                await notificationService.createNotification(assignedUserId, 'Nueva Solicitud Asignada', `Se te ha asignado la solicitud de producción: ${name}`, 'info');
            } catch (err) { console.error(err); }
        }

        return savedRequest;
    }

    async updateProductionRequest(id: number, data: ProductionRequestDTO, userId: number | undefined) {
        let { name, department, assignedUserId, deliveryDate, observations, status, stage, customerData, audienceData, campaignDetail, productionInfo, unitAssigned } = data;
        if (!name || !department) throw new Error('Missing required fields');
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');

        const repo = AppDataSource.getRepository(ProductionRequest);
        const existingRequest = await repo.findOne({ where: { id }, relations: ['customerData', 'audienceData', 'campaignDetail', 'campaignDetail.campaignProducts', 'productionInfo'] });
        if (!existingRequest) throw new Error('Production request not found');

        let assignmentMethod = 'Manual';
        const departmentChanged = department && existingRequest.department !== department;
        if (departmentChanged || (department && !assignedUserId && !existingRequest.assignedUserId)) {
            const assignment = await performSmartAssignment(department);
            if (assignment) {
                assignedUserId = assignment.assignedUserId;
                assignmentMethod = 'Smart Workload Distribution';
            }
        }

        if (userId) {
            await historyService.logDifferences(existingRequest, { name, department, assignedUserId, deliveryDate: deliveryDate ? new Date(deliveryDate) : null, observations, status: status || stage || existingRequest.status }, userId);
        }

        existingRequest.name = name;
        existingRequest.department = department !== undefined ? department : existingRequest.department;
        existingRequest.assignedUserId = assignedUserId || null;
        existingRequest.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
        existingRequest.observations = observations || null;
        let oldAssignedUserId = existingRequest.assignedUserId;

        const targetStage = status || stage;
        if (targetStage === 'closed_won') {
            if (data.consecutive === undefined || data.consecutive === null || isNaN(Number(data.consecutive)) || Number(data.consecutive) <= 0) {
                throw new Error('Se requiere un consecutivo válido para avanzar a la etapa Cerrado Ganado.');
            }
        }

        if (targetStage && targetStage !== existingRequest.status) {
            const rulesResult = await workflowService.advanceStage(existingRequest, { ...data, targetStage, budget: campaignDetail?.budget ? parseInt(String(campaignDetail.budget).replace(/[^0-9]/g, '')) : undefined, saleClosed: targetStage === 'completed' ? false : true } as Record<string, unknown>);
            if (rulesResult.assignmentMethod !== 'Manual') assignmentMethod = rulesResult.assignmentMethod;
            assignedUserId = existingRequest.assignedUserId || undefined;
        }

        if (customerData) existingRequest.customerData = { ...existingRequest.customerData, ...(customerData as unknown as CustomerData) };
        if (audienceData) existingRequest.audienceData = { ...existingRequest.audienceData, ...(audienceData as unknown as AudienceData) };
        if (productionInfo) existingRequest.productionInfo = { ...existingRequest.productionInfo, ...(productionInfo as unknown as ProductionInfo) };
        if (unitAssigned !== undefined) existingRequest.unitAssigned = unitAssigned !== undefined ? String(unitAssigned) : (existingRequest.unitAssigned || null);
        if (data.consecutive !== undefined) existingRequest.consecutive = data.consecutive ? Number(data.consecutive) : null;
        if (campaignDetail) {
            if (campaignDetail.budget !== undefined && campaignDetail.budget !== null) campaignDetail.budget = String(campaignDetail.budget);
            existingRequest.campaignDetail = { ...existingRequest.campaignDetail, ...(campaignDetail as unknown as CampaignDetail), budget: campaignDetail.budget !== undefined && campaignDetail.budget !== null ? String(campaignDetail.budget) : existingRequest.campaignDetail?.budget } as unknown as CampaignDetail;
        }

        const updatedRequest = await repo.save(existingRequest);

        // Verification query: confirm DB persistence of consecutive & status
        const verification = await repo.findOne({ where: { id: existingRequest.id } });
        if (!verification) {
            throw new Error('Error de verificación: La solicitud no se encontró tras el guardado.');
        }
        if (targetStage === 'closed_won' && (verification.status !== 'closed_won' || !verification.consecutive)) {
            throw new Error('Error de base de datos: El consecutivo o el estado no se guardaron correctamente.');
        }

        if (userId && assignmentMethod !== 'Manual' && assignedUserId) {
            await historyService.logChange(updatedRequest.id, 'AssignmentMethod', null, `${assignmentMethod}: Auto-assigned to user ID ${assignedUserId}`, userId, 'update');
        }

        if (assignedUserId && assignedUserId !== oldAssignedUserId && assignmentMethod !== 'Manual') {
            try { await notificationService.createNotification(assignedUserId, 'Nueva Solicitud Asignada', `Se te ha asignado la solicitud de producción: ${existingRequest.name}`, 'info'); } catch (err) { console.error(err); }
        }

        return updatedRequest;
    }

    async updateProductionRequestPartial(id: number, data: Partial<ProductionRequestDTO>, userId: number | undefined) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        const repo = AppDataSource.getRepository(ProductionRequest);
        const existingRequest = await repo.findOne({ where: { id }, relations: ['customerData', 'audienceData', 'campaignDetail', 'campaignDetail.campaignProducts', 'productionInfo'] });
        if (!existingRequest) throw new Error('Production request not found');

        let assignmentMethod = 'Manual';
        let assignedUserId = existingRequest.assignedUserId;
        let oldAssignedUserId = existingRequest.assignedUserId;

        const targetStage = data.status || data.stage;
        if (targetStage === 'closed_won') {
            if (data.consecutive === undefined || data.consecutive === null || isNaN(Number(data.consecutive)) || Number(data.consecutive) <= 0) {
                throw new Error('Se requiere un consecutivo válido para avanzar a la etapa Cerrado Ganado.');
            }
        }

        if (targetStage && targetStage !== existingRequest.status) {
            const rulesResult = await workflowService.advanceStage(existingRequest, { ...data, targetStage, budget: data.campaignDetail?.budget ? parseInt(String(data.campaignDetail.budget).replace(/[^0-9]/g, '')) : undefined, saleClosed: targetStage === 'completed' ? false : true });
            assignmentMethod = rulesResult.assignmentMethod;
            oldAssignedUserId = rulesResult.oldAssignedUserId;
            assignedUserId = existingRequest.assignedUserId;
        }

        if (data.department && data.department !== existingRequest.department && !data.assignedUserId) {
            const assignment = await performSmartAssignment(data.department);
            if (assignment) {
                assignedUserId = assignment.assignedUserId;
                assignmentMethod = 'Smart Workload Distribution';
            }
        } else if (data.assignedUserId !== undefined) {
            assignedUserId = data.assignedUserId;
        }

        if (data.name !== undefined) existingRequest.name = data.name;
        if (data.department !== undefined) existingRequest.department = data.department;
        existingRequest.assignedUserId = assignedUserId;
        if (data.deliveryDate !== undefined) existingRequest.deliveryDate = data.deliveryDate ? new Date(data.deliveryDate) : null;
        if (data.observations !== undefined) existingRequest.observations = data.observations || null;
        if (data.unitAssigned !== undefined) existingRequest.unitAssigned = data.unitAssigned ? String(data.unitAssigned) : null;
        if (data.consecutive !== undefined) existingRequest.consecutive = data.consecutive ? Number(data.consecutive) : null;

        if (data.customerData) existingRequest.customerData = { ...existingRequest.customerData, ...data.customerData } as unknown as CustomerData;
        if (data.audienceData) existingRequest.audienceData = { ...existingRequest.audienceData, ...data.audienceData } as unknown as AudienceData;
        if (data.productionInfo) existingRequest.productionInfo = { ...existingRequest.productionInfo, ...data.productionInfo } as unknown as ProductionInfo;
        if (data.campaignDetail) {
            if (data.campaignDetail.budget !== undefined && data.campaignDetail.budget !== null) data.campaignDetail.budget = String(data.campaignDetail.budget);
            existingRequest.campaignDetail = { ...existingRequest.campaignDetail, ...data.campaignDetail, budget: data.campaignDetail.budget ? String(data.campaignDetail.budget) : existingRequest.campaignDetail?.budget } as unknown as CampaignDetail;
        }

        const updatedRequest = await repo.save(existingRequest);

        // Verification query: confirm DB persistence of consecutive & status
        const verification = await repo.findOne({ where: { id: existingRequest.id } });
        if (!verification) {
            throw new Error('Error de verificación: La solicitud no se encontró tras el guardado.');
        }
        if (targetStage === 'closed_won' && (verification.status !== 'closed_won' || !verification.consecutive)) {
            throw new Error('Error de base de datos: El consecutivo o el estado no se guardaron correctamente.');
        }

        if (userId) {
            await historyService.logDifferences(existingRequest, { ...data, assignedUserId: existingRequest.assignedUserId || undefined, department: existingRequest.department } as unknown as Partial<ProductionRequest>, userId);
            if (assignmentMethod !== 'Manual' && existingRequest.assignedUserId) {
                await historyService.logChange(updatedRequest.id, 'AssignmentMethod', null, `${assignmentMethod}: Auto-assigned to user ID ${existingRequest.assignedUserId}`, userId, 'update');
            }
        }

        if (existingRequest.assignedUserId && existingRequest.assignedUserId !== oldAssignedUserId && assignmentMethod !== 'Manual') {
            try { await notificationService.createNotification(existingRequest.assignedUserId, 'Nueva Solicitud Asignada', `Se te ha asignado la solicitud de producción: ${existingRequest.name}`, 'info'); } catch (err) { console.error(err); }
        }

        return updatedRequest;
    }

    async updateStepCampaign(id: number, data: Partial<ProductionRequestDTO>, userId: number | undefined) {
        return this.updateProductionRequestPartial(id, data, userId);
    }
}

