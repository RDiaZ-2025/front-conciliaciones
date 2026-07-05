import { ProductionRequest, Product, User, FormatType, RightsDuration, Team, ProductionRequestType, DynamicForm, DynamicFormField, DynamicFormSubmission, DynamicFormFieldValue, DynamicWorkflowStage, DynamicSubmissionWorkflowState } from "../models";
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
        return await AppDataSource.getRepository(DynamicForm).find({
            where: { isEntryForm: true, isActive: true },
            order: { id: 'ASC' }
        });
    }

    async getFormFields(formId: number) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        return await AppDataSource.getRepository(DynamicFormField).find({
            where: { formId },
            order: { displayOrder: 'ASC' }
        });
    }

    async createSubmission(formId: number, requesterUserId: number, values: Record<string, string>) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        
        return await AppDataSource.transaction(async (transactionManager) => {
            const subRepo = transactionManager.getRepository(DynamicFormSubmission);
            const valRepo = transactionManager.getRepository(DynamicFormFieldValue);
            const stageRepo = transactionManager.getRepository(DynamicWorkflowStage);
            const stateRepo = transactionManager.getRepository(DynamicSubmissionWorkflowState);
            const userRepo = transactionManager.getRepository(User);

            // Create submission header
            const submission = subRepo.create({
                formId,
                requesterUserId,
                status: 'Pending'
            });
            const savedSubmission = await subRepo.save(submission);

            // Fetch dynamic fields for validation/default generation
            const fields = await transactionManager.getRepository(DynamicFormField).find({
                where: { formId },
                order: { displayOrder: 'ASC' }
            });

            // Insert values
            for (const field of fields) {
                let valueStr = values[field.name];

                // Auto-fill read-only defaults if not provided or to ensure integrity
                if (field.isReadOnly && field.defaultValueExpression) {
                    if (field.defaultValueExpression === '{{CURRENT_DATE_TIME}}') {
                        // Format: YYYY-MM-DD HH:mm (24h)
                        const now = new Date();
                        const pad = (n: number) => n.toString().padStart(2, '0');
                        valueStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
                    } else if (field.defaultValueExpression === '{{LOGGED_USER_NAME}}') {
                        const requester = await userRepo.findOne({ where: { id: requesterUserId } });
                        valueStr = requester?.name || 'Usuario';
                    }
                }

                if (valueStr !== undefined && valueStr !== null) {
                    const fieldValue = valRepo.create({
                        submissionId: savedSubmission.id,
                        fieldId: field.id,
                        value: valueStr
                    });
                    await valRepo.save(fieldValue);
                }
            }

            // Find first stage in workflow (stepOrder = 1)
            const firstStage = await stageRepo.findOne({
                where: { formId, stepOrder: 1 }
            });

            if (firstStage) {
                savedSubmission.currentStageId = firstStage.id;
                savedSubmission.status = 'In Progress';
                await subRepo.save(savedSubmission);

                // Resolve assignee
                let assigneeUserId: number | null = null;
                if (firstStage.assigneeType === 'specific_user') {
                    assigneeUserId = firstStage.assigneeUserId;
                } else if (firstStage.assigneeType === 'requester_boss') {
                    const requester = await userRepo.findOne({ where: { id: requesterUserId } });
                    assigneeUserId = requester?.bossId || firstStage.assigneeUserId || 1; // Fallback to admin/specific_user if no boss
                } else if (firstStage.assigneeType === 'team' && firstStage.assigneeTeamId) {
                    // Load balancing: pick user in active team with least pending tasks
                    const teamUsers = await userRepo.find({
                        where: { teamId: firstStage.assigneeTeamId, status: 1 }
                    });
                    if (teamUsers.length > 0) {
                        const workloads = await Promise.all(teamUsers.map(async (u) => {
                            const count = await stateRepo.count({
                                where: { assignedUserId: u.id, status: 'Pending' }
                            });
                            return { userId: u.id, count };
                        }));
                        workloads.sort((a, b) => a.count - b.count);
                        assigneeUserId = workloads[0].userId;
                    } else {
                        assigneeUserId = firstStage.assigneeUserId || 1;
                    }
                }

                if (!assigneeUserId) assigneeUserId = 1; // absolute fallback to user ID 1 (Admin)

                // Create initial stage workflow entry
                const state = stateRepo.create({
                    submissionId: savedSubmission.id,
                    stageId: firstStage.id,
                    assignedUserId: assigneeUserId,
                    status: 'Pending'
                });
                await stateRepo.save(state);

                // Send notification
                try {
                    await notificationService.createNotification(
                        assigneeUserId,
                        'Nueva Tarea de Flujo Asignada',
                        `Se te ha asignado la tarea: "${firstStage.name}"`,
                        'info'
                    );
                } catch (err) {
                    console.error('Error sending notification:', err);
                }
            }

            return savedSubmission;
        });
    }

    async getSubmissions(userId: number) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        const submissions = await AppDataSource.getRepository(DynamicFormSubmission).find({
            where: { requesterUserId: userId },
            relations: ['form', 'currentStage'],
            order: { createdAt: 'DESC' }
        });

        const stateRepo = AppDataSource.getRepository(DynamicSubmissionWorkflowState);
        const results = await Promise.all(submissions.map(async (sub) => {
            let assigneeName = 'N/A';
            let assigneeEmail: string | undefined = undefined;
            if (sub.currentStageId) {
                const activeState = await stateRepo.findOne({
                    where: { submissionId: sub.id, stageId: sub.currentStageId, status: 'Pending' },
                    relations: ['assignedUser']
                });
                if (activeState && activeState.assignedUser) {
                    assigneeName = activeState.assignedUser.name;
                    assigneeEmail = activeState.assignedUser.email;
                }
            }
            return {
                id: sub.id,
                formName: sub.form.name,
                createdAt: sub.createdAt,
                stageName: sub.currentStage ? sub.currentStage.name : 'Completado',
                status: sub.status,
                assigneeName,
                assigneeEmail,
                consecutive: sub.consecutive,
                icon: sub.form.icon
            };
        }));

        return results;
    }

    async getSubmissionDetails(submissionId: number) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        const subRepo = AppDataSource.getRepository(DynamicFormSubmission);
        const valRepo = AppDataSource.getRepository(DynamicFormFieldValue);
        const stateRepo = AppDataSource.getRepository(DynamicSubmissionWorkflowState);

        const sub = await subRepo.findOne({
            where: { id: submissionId },
            relations: ['form', 'currentStage', 'requesterUser']
        });
        if (!sub) throw new Error('Solicitud no encontrada');

        const values = await valRepo.find({
            where: { submissionId },
            relations: ['field', 'field.form']
        });

        const entryValues = values.filter(v => v && v.field && v.field.formId === sub.formId);
        const stageValues = values.filter(v => v && v.field && v.field.formId !== sub.formId);

        const statesQuery: any = { submissionId };
        if (sub.status === 'Pending Consecutive') {
            statesQuery.status = In(['Approved', 'Rejected', 'Pending']);
        } else {
            statesQuery.status = In(['Approved', 'Rejected']);
        }

        const completedStates = await stateRepo.find({
            where: statesQuery,
            relations: ['stage', 'actionedByUser', 'assignedUser', 'stage.formToFill'],
            order: { createdAt: 'ASC' }
        });

        const historyStages = completedStates.map(cState => {
            const stageVals = values.filter(v => v && v.field && v.field.formId === cState.stage.formIdToFill);
            const user = cState.actionedByUser || cState.assignedUser;
            return {
                stageName: cState.stage.name,
                formName: cState.stage.formToFill ? cState.stage.formToFill.name : cState.stage.name,
                actionedByUserName: user?.name || 'N/A',
                actionedByUserEmail: user?.email || 'N/A',
                actionedAt: cState.updatedAt,
                status: cState.status === 'Pending' ? 'Approved' : cState.status,
                notes: cState.notes,
                values: stageVals.map(v => ({
                    label: v.field.label,
                    value: v.value
                }))
            };
        });

        return {
            id: sub.id,
            formName: sub.form.name,
            createdAt: sub.createdAt,
            status: sub.status,
            consecutive: sub.consecutive,
            stageName: sub.currentStage ? sub.currentStage.name : 'Completado',
            requesterName: sub.requesterUser ? sub.requesterUser.name : 'Usuario',
            requesterEmail: sub.requesterUser ? sub.requesterUser.email : '',
            values: entryValues.map(v => ({
                label: v.field.label,
                value: v.value
            })),
            stageValues: stageValues.map(v => ({
                label: v.field.label,
                value: v.value,
                formName: v.field.form ? v.field.form.name : 'Etapa'
            })),
            historyStages
        };
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

    // --- ADMIN FORMS ---
    async adminGetForms() {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        return await AppDataSource.getRepository(DynamicForm).find({
            order: { name: 'ASC' }
        });
    }

    async adminCreateForm(data: Partial<DynamicForm>) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        const repo = AppDataSource.getRepository(DynamicForm);
        const form = repo.create({
            name: data.name,
            description: data.description,
            isEntryForm: data.isEntryForm ?? true,
            isActive: data.isActive ?? true,
            responsible: data.responsible,
            role: data.role,
            icon: data.icon,
            requireConsecutive: data.requireConsecutive ?? true
        });
        return await repo.save(form);
    }

    async adminUpdateForm(id: number, data: Partial<DynamicForm>) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        const repo = AppDataSource.getRepository(DynamicForm);
        const form = await repo.findOne({ where: { id } });
        if (!form) throw new Error('Formulario no encontrado');
        
        if (data.name !== undefined) form.name = data.name;
        if (data.description !== undefined) form.description = data.description;
        if (data.isEntryForm !== undefined) form.isEntryForm = data.isEntryForm;
        if (data.isActive !== undefined) form.isActive = data.isActive;
        if (data.responsible !== undefined) form.responsible = data.responsible;
        if (data.role !== undefined) form.role = data.role;
        if (data.icon !== undefined) form.icon = data.icon;
        if (data.requireConsecutive !== undefined) form.requireConsecutive = data.requireConsecutive;

        return await repo.save(form);
    }

    async adminDeleteForm(id: number) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        const repo = AppDataSource.getRepository(DynamicForm);
        const form = await repo.findOne({ where: { id } });
        if (!form) throw new Error('Formulario no encontrado');
        form.isActive = false;
        return await repo.save(form);
    }

    async adminSaveFields(formId: number, fields: Partial<DynamicFormField>[]) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        return await AppDataSource.transaction(async (manager) => {
            const fieldRepo = manager.getRepository(DynamicFormField);

            // Fetch existing field IDs to know what to delete
            const existingFields = await fieldRepo.find({ where: { formId } });
            const inputIds = fields.map(f => f.id).filter(id => !!id) as number[];
            
            // Delete fields that are not in the input list
            const fieldsToDelete = existingFields.filter(ef => !inputIds.includes(ef.id));
            if (fieldsToDelete.length > 0) {
                await fieldRepo.remove(fieldsToDelete);
            }

            // Insert or Update fields
            const savedFields = [];
            for (let i = 0; i < fields.length; i++) {
                const f = fields[i];
                let fieldEntity = existingFields.find(ef => ef.id === f.id);

                if (!fieldEntity) {
                    fieldEntity = fieldRepo.create({
                        formId,
                        name: f.name || `field_${Date.now()}_${i}`,
                        label: f.label || 'Campo nuevo',
                        description: f.description,
                        type: f.type || 'text',
                        placeholder: f.placeholder,
                        isRequired: f.isRequired ?? false,
                        isReadOnly: f.isReadOnly ?? false,
                        defaultValueExpression: f.defaultValueExpression,
                        displayOrder: f.displayOrder ?? (i + 1),
                        metadata: f.metadata ? (typeof f.metadata === 'string' ? f.metadata : JSON.stringify(f.metadata)) : null
                    });
                } else {
                    if (f.name !== undefined) fieldEntity.name = f.name;
                    if (f.label !== undefined) fieldEntity.label = f.label;
                    if (f.description !== undefined) fieldEntity.description = f.description;
                    if (f.type !== undefined) fieldEntity.type = f.type;
                    if (f.placeholder !== undefined) fieldEntity.placeholder = f.placeholder;
                    if (f.isRequired !== undefined) fieldEntity.isRequired = f.isRequired;
                    if (f.isReadOnly !== undefined) fieldEntity.isReadOnly = f.isReadOnly;
                    if (f.defaultValueExpression !== undefined) fieldEntity.defaultValueExpression = f.defaultValueExpression;
                    if (f.displayOrder !== undefined) fieldEntity.displayOrder = f.displayOrder;
                    if (f.metadata !== undefined) fieldEntity.metadata = f.metadata ? (typeof f.metadata === 'string' ? f.metadata : JSON.stringify(f.metadata)) : null;
                }

                savedFields.push(await fieldRepo.save(fieldEntity));
            }

            return savedFields;
        });
    }

    // --- ADMIN WORKFLOWS ---
    async adminGetStages(formId: number) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        return await AppDataSource.getRepository(DynamicWorkflowStage).find({
            where: { formId },
            relations: ['assigneeUser', 'assigneeTeam', 'formToFill', 'rejectionTargetUser', 'rejectionTargetTeam'],
            order: { stepOrder: 'ASC' }
        });
    }

    async adminSaveStages(formId: number, stages: Partial<DynamicWorkflowStage>[]) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        return await AppDataSource.transaction(async (manager) => {
            const stageRepo = manager.getRepository(DynamicWorkflowStage);

            // Fetch existing stages to know what to delete
            const existingStages = await stageRepo.find({ where: { formId } });
            const inputIds = stages.map(s => s.id).filter(id => !!id) as number[];

            // Delete stages that are not in the input list
            const stagesToDelete = existingStages.filter(es => !inputIds.includes(es.id));
            if (stagesToDelete.length > 0) {
                await stageRepo.remove(stagesToDelete);
            }

            // Insert or Update stages
            const savedStages = [];
            for (let i = 0; i < stages.length; i++) {
                const s = stages[i];
                let stageEntity = existingStages.find(es => es.id === s.id);

                if (!stageEntity) {
                    stageEntity = stageRepo.create({
                        formId,
                        name: s.name || `Etapa ${i + 1}`,
                        description: s.description,
                        stepOrder: s.stepOrder ?? (i + 1),
                        assigneeType: s.assigneeType || 'specific_user',
                        assigneeUserId: s.assigneeUserId || null,
                        assigneeTeamId: s.assigneeTeamId || null,
                        formIdToFill: s.formIdToFill || null,
                        rejectionTargetType: s.rejectionTargetType || 'previous_sender',
                        rejectionTargetUserId: s.rejectionTargetUserId || null,
                        rejectionTargetTeamId: s.rejectionTargetTeamId || null
                    });
                } else {
                    if (s.name !== undefined) stageEntity.name = s.name;
                    if (s.description !== undefined) stageEntity.description = s.description;
                    if (s.stepOrder !== undefined) stageEntity.stepOrder = s.stepOrder;
                    if (s.assigneeType !== undefined) stageEntity.assigneeType = s.assigneeType;
                    if (s.assigneeUserId !== undefined) stageEntity.assigneeUserId = s.assigneeUserId;
                    if (s.assigneeTeamId !== undefined) stageEntity.assigneeTeamId = s.assigneeTeamId;
                    if (s.formIdToFill !== undefined) stageEntity.formIdToFill = s.formIdToFill;
                    if (s.rejectionTargetType !== undefined) stageEntity.rejectionTargetType = s.rejectionTargetType;
                    if (s.rejectionTargetUserId !== undefined) stageEntity.rejectionTargetUserId = s.rejectionTargetUserId;
                    if (s.rejectionTargetTeamId !== undefined) stageEntity.rejectionTargetTeamId = s.rejectionTargetTeamId;
                }

                savedStages.push(await stageRepo.save(stageEntity));
            }

            return savedStages;
        });
    }

    // --- APPROVALS INBOX ---
    async getPendingApprovals(userId: number) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        const stateRepo = AppDataSource.getRepository(DynamicSubmissionWorkflowState);

        const states = await stateRepo.find({
            where: { assignedUserId: userId, status: 'Pending' },
            relations: ['submission', 'submission.form', 'stage', 'stage.formToFill', 'submission.requesterUser'],
            order: { createdAt: 'DESC' }
        });

        // For each pending approval, fetch the values of the submission
        const valRepo = AppDataSource.getRepository(DynamicFormFieldValue);
        const results = [];
        for (const state of states) {
            const values = await valRepo.find({
                where: { submissionId: state.submissionId },
                relations: ['field', 'field.form']
            });

            const prevState = await stateRepo.findOne({
                where: { submissionId: state.submissionId, status: 'Rejected' },
                order: { updatedAt: 'DESC' }
            });
            const rejectionNotes = prevState ? prevState.notes : null;

            const submittedValuesRaw: Record<string, string> = {};
            for (const v of values) {
                if (v && v.field) {
                    submittedValuesRaw[v.field.name] = v.value || '';
                }
            }

            const nextStage = await AppDataSource.getRepository(DynamicWorkflowStage)
                .createQueryBuilder("stage")
                .where("stage.formId = :formId", { formId: state.submission.formId })
                .andWhere("stage.stepOrder > :stepOrder", { stepOrder: state.stage.stepOrder })
                .getOne();
            const isFinalStage = !nextStage;

            const statesQuery: any = { submissionId: state.submissionId };
            if (state.submission.status === 'Pending Consecutive') {
                statesQuery.status = In(['Approved', 'Rejected', 'Pending']);
            } else {
                statesQuery.status = In(['Approved', 'Rejected']);
            }

            const completedStates = await stateRepo.find({
                where: statesQuery,
                relations: ['stage', 'actionedByUser', 'assignedUser', 'stage.formToFill'],
                order: { createdAt: 'ASC' }
            });

            const historyStages = completedStates.map(cState => {
                const stageVals = values.filter(v => v && v.field && v.field.formId === cState.stage.formIdToFill);
                const user = cState.actionedByUser || cState.assignedUser;
                return {
                    stageName: cState.stage.name,
                    formName: cState.stage.formToFill ? cState.stage.formToFill.name : cState.stage.name,
                    actionedByUserName: user?.name || 'N/A',
                    actionedByUserEmail: user?.email || 'N/A',
                    actionedAt: cState.updatedAt,
                    status: cState.status === 'Pending' ? 'Approved' : cState.status,
                    notes: cState.notes,
                    values: stageVals.map(v => ({
                        label: v.field.label,
                        value: v.value
                    }))
                };
            });

            results.push({
                stateId: state.id,
                submissionId: state.submissionId,
                formId: state.submission.formId,
                requesterUserId: state.submission.requesterUserId,
                submissionStatus: state.submission.status,
                rejectionNotes,
                formName: state.submission.form.name,
                requesterName: state.submission.requesterUser ? state.submission.requesterUser.name : 'Usuario',
                requesterEmail: state.submission.requesterUser ? state.submission.requesterUser.email : '',
                createdAt: state.submission.createdAt,
                assignedAt: state.createdAt,
                stageName: state.stage.name,
                stageDescription: state.stage.description,
                formIdToFill: state.stage.formIdToFill,
                formToFill: state.stage.formToFill,
                isFinalStage,
                icon: state.submission.form.icon,
                values: values.filter(v => v && v.field && v.field.formId === state.submission.formId).map(v => ({
                    label: v.field.label,
                    value: v.value
                })),
                stageValues: values.filter(v => v && v.field && v.field.formId !== state.submission.formId).map(v => ({
                    label: v.field.label,
                    value: v.value,
                    formName: v.field.form ? v.field.form.name : 'Etapa'
                })),
                submittedValuesRaw,
                requireConsecutive: state.submission.form ? state.submission.form.requireConsecutive : true,
                historyStages
            });
        }

        return results;
    }

    async actionApproval(stateId: number, userId: number, action: 'approve' | 'reject', notes: string, formValues?: Record<string, string>, consecutive?: string) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        return await AppDataSource.transaction(async (manager) => {
            const stateRepo = manager.getRepository(DynamicSubmissionWorkflowState);
            const subRepo = manager.getRepository(DynamicFormSubmission);
            const userRepo = manager.getRepository(User);
            const stageRepo = manager.getRepository(DynamicWorkflowStage);
            const valRepo = manager.getRepository(DynamicFormFieldValue);

            // 1. Find active workflow state
            const currentState = await stateRepo.findOne({
                where: { id: stateId, assignedUserId: userId, status: 'Pending' },
                relations: ['submission', 'stage', 'submission.form']
            });
            if (!currentState) throw new Error('Tarea pendiente no encontrada o ya procesada');

            const submission = currentState.submission;
            const stage = currentState.stage;

            const isCorrection = (submission.status === 'Rejected' && currentState.assignedUserId === submission.requesterUserId);

            if (isCorrection) {
                // 1. Save / Update original form fields
                if (formValues) {
                    const fieldsToSave = await manager.getRepository(DynamicFormField).find({
                        where: { formId: submission.formId }
                    });
                    for (const field of fieldsToSave) {
                        const valueStr = formValues[field.name];
                        if (valueStr !== undefined && valueStr !== null) {
                            let existingVal = await valRepo.findOne({
                                where: { submissionId: submission.id, fieldId: field.id }
                            });
                            if (existingVal) {
                                existingVal.value = valueStr;
                                await valRepo.save(existingVal);
                            } else {
                                const newVal = valRepo.create({
                                    submissionId: submission.id,
                                    fieldId: field.id,
                                    value: valueStr
                                });
                                await valRepo.save(newVal);
                            }
                        }
                    }
                }

                // 2. Complete current state
                currentState.status = 'Approved';
                currentState.actionedByUserId = userId;
                currentState.notes = 'Corrección enviada';
                await stateRepo.save(currentState);

                // 3. Update submission status and stage
                submission.status = 'In Progress';
                submission.currentStageId = stage.id;
                await subRepo.save(submission);

                // 4. Resolve assignee for the same stage to review again
                let assigneeUserId: number | null = null;
                if (stage.assigneeType === 'specific_user') {
                    assigneeUserId = stage.assigneeUserId;
                } else if (stage.assigneeType === 'requester_boss') {
                    const requester = await userRepo.findOne({ where: { id: submission.requesterUserId } });
                    assigneeUserId = requester?.bossId || stage.assigneeUserId || 1;
                } else if (stage.assigneeType === 'team' && stage.assigneeTeamId) {
                    const teamUsers = await userRepo.find({
                        where: { teamId: stage.assigneeTeamId, status: 1 }
                    });
                    if (teamUsers.length > 0) {
                        const workloads = await Promise.all(teamUsers.map(async (u) => {
                            const count = await stateRepo.count({
                                where: { assignedUserId: u.id, status: 'Pending' }
                            });
                            return { userId: u.id, count };
                        }));
                        workloads.sort((a, b) => a.count - b.count);
                        assigneeUserId = workloads[0].userId;
                    } else {
                        assigneeUserId = stage.assigneeUserId || 1;
                    }
                }

                if (!assigneeUserId) assigneeUserId = 1;

                const nextState = stateRepo.create({
                    submissionId: submission.id,
                    stageId: stage.id,
                    assignedUserId: assigneeUserId,
                    status: 'Pending'
                });
                await stateRepo.save(nextState);

                // Notification
                try {
                    await notificationService.createNotification(
                        assigneeUserId,
                        'Corrección de Solicitud Recibida',
                        `Se ha enviado una corrección para la solicitud de "${submission.form.name}". Por favor, revísala nuevamente.`,
                        'info'
                    );
                } catch (err) {
                    console.error('Error sending notification:', err);
                }

                return submission;
            }

            // --- STANDARD WORKFLOW (Approve / Reject) ---
            // 2. If approved and there are values to fill, save them
            if (action === 'approve' && stage.formIdToFill && formValues) {
                // Save these filled values under this submission!
                const fields = await manager.getRepository(DynamicFormField).find({
                    where: { formId: stage.formIdToFill }
                });
                for (const field of fields) {
                    const valueStr = formValues[field.name];
                    if (valueStr !== undefined && valueStr !== null) {
                        const fieldValue = valRepo.create({
                            submissionId: submission.id,
                            fieldId: field.id,
                            value: valueStr
                        });
                        await valRepo.save(fieldValue);
                    }
                }
            }

            if (action === 'approve') {
                // Find next stage
                const nextStage = await stageRepo.createQueryBuilder("stage")
                    .where("stage.formId = :formId", { formId: submission.formId })
                    .andWhere("stage.stepOrder > :stepOrder", { stepOrder: stage.stepOrder })
                    .orderBy("stage.stepOrder", "ASC")
                    .getOne();

                if (nextStage) {
                    // Mark current workflow state as Approved since it transitions to next stage
                    currentState.status = 'Approved';
                    currentState.actionedByUserId = userId;
                    currentState.notes = notes;
                    await stateRepo.save(currentState);

                    submission.currentStageId = nextStage.id;
                    submission.status = 'In Progress';
                    await subRepo.save(submission);

                    // Resolve assignee for the next stage
                    let assigneeUserId: number | null = null;
                    if (nextStage.assigneeType === 'specific_user') {
                        assigneeUserId = nextStage.assigneeUserId;
                    } else if (nextStage.assigneeType === 'requester_boss') {
                        const requester = await userRepo.findOne({ where: { id: submission.requesterUserId } });
                        assigneeUserId = requester?.bossId || nextStage.assigneeUserId || 1;
                    } else if (nextStage.assigneeType === 'team' && nextStage.assigneeTeamId) {
                        const teamUsers = await userRepo.find({
                            where: { teamId: nextStage.assigneeTeamId, status: 1 }
                        });
                        if (teamUsers.length > 0) {
                            const workloads = await Promise.all(teamUsers.map(async (u) => {
                                const count = await stateRepo.count({
                                    where: { assignedUserId: u.id, status: 'Pending' }
                                });
                                return { userId: u.id, count };
                            }));
                            workloads.sort((a, b) => a.count - b.count);
                            assigneeUserId = workloads[0].userId;
                        } else {
                            assigneeUserId = nextStage.assigneeUserId || 1;
                        }
                    }

                    if (!assigneeUserId) assigneeUserId = 1;

                    // Create next workflow state
                    const nextState = stateRepo.create({
                        submissionId: submission.id,
                        stageId: nextStage.id,
                        assignedUserId: assigneeUserId,
                        status: 'Pending'
                    });
                    await stateRepo.save(nextState);

                    // Notification
                    try {
                        await notificationService.createNotification(
                            assigneeUserId,
                            'Nueva Tarea de Flujo Asignada',
                            `Se te ha asignado la tarea: "${nextStage.name}" para la solicitud dinámica de ${currentState.submission.form.name}`,
                            'info'
                        );
                    } catch (err) {
                        console.error('Error sending notification:', err);
                    }
                } else {
                    // No next stage, it's the final stage!
                    const requireConsec = submission.form ? submission.form.requireConsecutive : true;

                    if (requireConsec && !consecutive) {
                        // Mark submission as Pending Consecutive, currentState remains Pending!
                        submission.status = 'Pending Consecutive';
                        await subRepo.save(submission);

                        currentState.actionedByUserId = userId;
                        currentState.notes = notes;
                        await stateRepo.save(currentState);
                    } else {
                        // Mark workflow state Approved and save consecutive
                        currentState.status = 'Approved';
                        currentState.actionedByUserId = userId;
                        currentState.notes = notes;
                        await stateRepo.save(currentState);

                        submission.currentStageId = null;
                        submission.status = 'Completed';
                        if (consecutive) {
                            submission.consecutive = consecutive;
                        }
                        await subRepo.save(submission);

                        // Notify the creator
                        try {
                            await notificationService.createNotification(
                                submission.requesterUserId,
                                'Solicitud Completada',
                                `Tu solicitud de "${currentState.submission.form.name}" ha sido completada y aprobada${consecutive ? ' con consecutivo ' + consecutive : ''}.`,
                                'success'
                            );
                        } catch (err) {
                            console.error('Error sending notification:', err);
                        }
                    }
                }
            } else if (action === 'reject') {
                currentState.status = 'Rejected';
                currentState.actionedByUserId = userId;
                currentState.notes = notes;
                await stateRepo.save(currentState);

                // Handle rejection routing
                let targetUserId: number | null = null;
                const targetType = stage.rejectionTargetType || 'previous_sender';

                if (targetType === 'previous_sender') {
                    // Find the state that approved this submission immediately prior
                    const prevState = await stateRepo.findOne({
                        where: { submissionId: submission.id, status: 'Approved' },
                        order: { updatedAt: 'DESC' }
                    });
                    targetUserId = prevState ? prevState.actionedByUserId : submission.requesterUserId;
                } else if (targetType === 'specific_user') {
                    targetUserId = stage.rejectionTargetUserId;
                } else if (targetType === 'team_random' && stage.rejectionTargetTeamId) {
                    const teamUsers = await userRepo.find({
                        where: { teamId: stage.rejectionTargetTeamId, status: 1 }
                    });
                    if (teamUsers.length > 0) {
                        const randIndex = Math.floor(Math.random() * teamUsers.length);
                        targetUserId = teamUsers[randIndex].id;
                    }
                }

                if (!targetUserId) targetUserId = submission.requesterUserId; // absolute fallback to submitter

                submission.status = 'Rejected';
                // Creator correction or assigned back
                if (targetUserId === submission.requesterUserId) {
                    submission.currentStageId = null;
                }
                await subRepo.save(submission);

                // Create workflow state for rejection recipient
                const rejectedState = stateRepo.create({
                    submissionId: submission.id,
                    stageId: stage.id,
                    assignedUserId: targetUserId,
                    status: 'Pending'
                });
                await stateRepo.save(rejectedState);

                // Notify target user
                try {
                    await notificationService.createNotification(
                        targetUserId,
                        'Solicitud Rechazada / Devuelta',
                        `La solicitud de "${currentState.submission.form.name}" ha sido devuelta. Comentarios: "${notes}"`,
                        'warning'
                    );
                } catch (err) {
                    console.error('Error sending notification:', err);
                }
            }

            return submission;
        });
    }
}

