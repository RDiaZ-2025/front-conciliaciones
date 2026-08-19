import { ProductionRequest, Product, User, FormatType, RightsDuration, Team, ProductionRequestType, DynamicWorkflow, DynamicForm, DynamicFormField, DynamicFormSubmission, DynamicFormFieldValue, DynamicWorkflowStage, DynamicSubmissionWorkflowState } from "../models";
import { AppDataSource } from "../config/typeorm.config";
import { NotificationService } from './notification.service';
import { ProductionRequestHistoryService } from './production_request_history.service';
import { AuthService } from './auth.service';
import { WorkflowService } from './workflow.service';
import { Not, In, IsNull } from "typeorm";
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
        const types = await AppDataSource.getRepository(DynamicForm).find({
            where: { isEntryForm: true, isActive: true, isInitialForm: false },
            order: { id: 'ASC' }
        });
        return types.map(t => {
            let parsedMeta = t.metadata;
            if (parsedMeta && typeof parsedMeta === 'string') {
                try { parsedMeta = JSON.parse(parsedMeta); } catch(e) {}
            }
            return {
                ...t,
                metadata: parsedMeta || {}
            };
        });
    }

    async getInitialForm() {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        return await AppDataSource.getRepository(DynamicForm).find({
            where: { isInitialForm: true, isActive: true },
            order: { displayOrder: 'ASC', id: 'ASC' }
        });
    }

    async getFormFields(formId: number, includeInactive: boolean = false) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        const whereClause: any = { formId };
        if (!includeInactive) {
            whereClause.isActive = true;
        }
        return await AppDataSource.getRepository(DynamicFormField).find({
            where: whereClause,
            order: { displayOrder: 'ASC' }
        });
    }

    async createSubmission(
        formId: number, 
        requesterUserId: number, 
        values: Record<string, string>, 
        targetFormIds?: number[], 
        submissions?: { formId: number; values: Record<string, string> }[],
        targetTeamIds?: number[],
        targetTeams?: Array<{ teamId: number; assignmentMode?: 'leader' | 'random' | 'workflow' }>
    ) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        
        return await AppDataSource.transaction(async (transactionManager) => {
            const subRepo = transactionManager.getRepository(DynamicFormSubmission);
            const valRepo = transactionManager.getRepository(DynamicFormFieldValue);
            const stageRepo = transactionManager.getRepository(DynamicWorkflowStage);
            const stateRepo = transactionManager.getRepository(DynamicSubmissionWorkflowState);
            const userRepo = transactionManager.getRepository(User);
            const teamRepo = transactionManager.getRepository(Team);

            if (submissions && submissions.length > 0) {
                // 1. Create root parent submission from first element
                const rootEntry = submissions[0];
                const rootSub = subRepo.create({
                    formId: rootEntry.formId,
                    requesterUserId,
                    status: 'Completed'
                });
                const savedRootSub = await subRepo.save(rootSub);

                // Insert values for root parent
                const rootFields = await transactionManager.getRepository(DynamicFormField).find({
                    where: { formId: rootEntry.formId },
                    order: { displayOrder: 'ASC' }
                });
                for (const field of rootFields) {
                    const valueStr = rootEntry.values[field.name];
                    if (valueStr !== undefined && valueStr !== null) {
                        const fieldValue = valRepo.create({
                            submissionId: savedRootSub.id,
                            fieldId: field.id,
                            value: String(valueStr)
                        });
                        await valRepo.save(fieldValue);
                    }
                }

                // 2. Create sibling parent submissions for subsequent entries
                for (let i = 1; i < submissions.length; i++) {
                    const entry = submissions[i];
                    const sibSub = subRepo.create({
                        formId: entry.formId,
                        requesterUserId,
                        parentSubmissionId: savedRootSub.id,
                        status: 'Completed'
                    });
                    const savedSibSub = await subRepo.save(sibSub);

                    const sibFields = await transactionManager.getRepository(DynamicFormField).find({
                        where: { formId: entry.formId },
                        order: { displayOrder: 'ASC' }
                    });
                    for (const field of sibFields) {
                        const valueStr = entry.values[field.name];
                        if (valueStr !== undefined && valueStr !== null) {
                            const fieldValue = valRepo.create({
                                submissionId: savedSibSub.id,
                                fieldId: field.id,
                                value: String(valueStr)
                            });
                            await valRepo.save(fieldValue);
                        }
                    }
                }

                // 3. Create child submissions for each selected Team linked to root parent
                let teamsToDispatch: Array<{ teamId: number; assignmentMode: 'leader' | 'random' | 'workflow' }> = [];
                if (targetTeams && targetTeams.length > 0) {
                    teamsToDispatch = targetTeams.map(t => ({
                        teamId: t.teamId,
                        assignmentMode: t.assignmentMode || 'leader'
                    }));
                } else if (targetTeamIds && targetTeamIds.length > 0) {
                    teamsToDispatch = targetTeamIds.map(id => ({
                        teamId: id,
                        assignmentMode: 'leader'
                    }));
                }

                if (teamsToDispatch.length > 0) {
                    let formWfId: number | null = null;
                    if (rootEntry.formId) {
                        const rootForm = await transactionManager.getRepository(DynamicForm).findOne({ where: { id: rootEntry.formId } });
                        formWfId = rootForm?.workflowId || null;
                    }

                    for (const teamTarget of teamsToDispatch) {
                        const team = await teamRepo.findOne({
                            where: { id: teamTarget.teamId },
                            relations: ['leader']
                        });
                        if (!team) continue;

                        const childSub = subRepo.create({
                            formId: rootEntry.formId,
                            workflowId: formWfId || null,
                            requesterUserId,
                            parentSubmissionId: savedRootSub.id,
                            status: 'Pending'
                        });
                        const savedChildSub = await subRepo.save(childSub);

                        // Save root entry field values directly to the child submission
                        for (const field of rootFields) {
                            const valueStr = rootEntry.values[field.name];
                            if (valueStr !== undefined && valueStr !== null) {
                                const fieldValue = valRepo.create({
                                    submissionId: savedChildSub.id,
                                    fieldId: field.id,
                                    value: String(valueStr)
                                });
                                await valRepo.save(fieldValue);
                            }
                        }

                        if (formWfId) {
                            const firstStage = await stageRepo.findOne({
                                where: { workflowId: formWfId, stepOrder: 1, isDeleted: false },
                                order: { stepOrder: 'ASC' }
                            });

                            if (firstStage) {
                                savedChildSub.currentStageId = firstStage.id;
                                savedChildSub.status = 'In Progress';
                                await subRepo.save(savedChildSub);

                                const mode = teamTarget.assignmentMode || 'leader';

                                if (mode === 'workflow') {
                                    // Mode 3: According to Stage 1 of the Workflow
                                    await this.createStageStates(transactionManager, savedChildSub, firstStage);
                                } else {
                                    let assignedUserId: number | null = null;

                                    if (mode === 'leader') {
                                        // Mode 1: Leader (fallback to random team member if no leader)
                                        assignedUserId = team.leaderId || null;
                                        if (!assignedUserId) {
                                            const teamMembers = await transactionManager.getRepository(User).find({
                                                where: { teamId: team.id }
                                            });
                                            const activeMembers = teamMembers.filter(u => u.status === 1 || u.status === undefined || u.status === null);
                                            const pool = activeMembers.length > 0 ? activeMembers : teamMembers;
                                            if (pool.length > 0) {
                                                const randomIndex = Math.floor(Math.random() * pool.length);
                                                assignedUserId = pool[randomIndex].id;
                                            }
                                        }
                                    } else if (mode === 'random') {
                                        // Mode 2: Random team member (fallback to leader)
                                        const teamMembers = await transactionManager.getRepository(User).find({
                                            where: { teamId: team.id }
                                        });
                                        const activeMembers = teamMembers.filter(u => u.status === 1 || u.status === undefined || u.status === null);
                                        const pool = activeMembers.length > 0 ? activeMembers : teamMembers;
                                        if (pool.length > 0) {
                                            const randomIndex = Math.floor(Math.random() * pool.length);
                                            assignedUserId = pool[randomIndex].id;
                                        } else if (team.leaderId) {
                                            assignedUserId = team.leaderId;
                                        }
                                    }

                                    if (assignedUserId) {
                                        const nextState = stateRepo.create({
                                            submissionId: savedChildSub.id,
                                            stageId: firstStage.id,
                                            assignedUserId: assignedUserId,
                                            customFormIdToFill: firstStage.formIdToFill || null,
                                            status: 'Pending'
                                        });
                                        await stateRepo.save(nextState);

                                        try {
                                            await notificationService.createNotification(
                                                assignedUserId,
                                                'Nueva Solicitud Asignada a tu Equipo',
                                                `Se ha asignado la tarea "${firstStage.name}" para el equipo ${team.name}.`,
                                                'info'
                                            );
                                        } catch (err) {
                                            console.error('Error sending notification to assigned user:', err);
                                        }
                                    } else {
                                        // Fallback to workflow stage 1 configuration
                                        await this.createStageStates(transactionManager, savedChildSub, firstStage);
                                    }
                                }
                            }
                        }
                    }
                } else if (targetFormIds && targetFormIds.length > 0) {
                    for (const targetFormId of targetFormIds) {
                        const targetForm = await transactionManager.getRepository(DynamicForm).findOne({ where: { id: targetFormId } });
                        if (!targetForm) continue;

                        const wfId = targetForm.workflowId;
                        const childSub = subRepo.create({
                            formId: targetFormId,
                            workflowId: wfId || null,
                            requesterUserId,
                            parentSubmissionId: savedRootSub.id,
                            status: 'Pending'
                        });
                        const savedChildSub = await subRepo.save(childSub);

                        const firstStage = await stageRepo.findOne({
                            where: [
                                { workflowId: wfId || -1, stepOrder: 1, isDeleted: false },
                                { formId: targetFormId, stepOrder: 1, isDeleted: false }
                            ],
                            order: { stepOrder: 'ASC' }
                        });

                        if (firstStage) {
                            savedChildSub.currentStageId = firstStage.id;
                            savedChildSub.status = 'In Progress';
                            await subRepo.save(savedChildSub);
                            await this.createStageStates(transactionManager, savedChildSub, firstStage);
                        }
                    }
                }
                return savedRootSub;
            }

            const form = await transactionManager.getRepository(DynamicForm).findOne({ where: { id: formId } });
            if (form && form.isInitialForm) {
                // Create parent submission header
                const submission = subRepo.create({
                    formId,
                    requesterUserId,
                    status: 'Completed'
                });
                const savedSubmission = await subRepo.save(submission);

                // Insert values for parent
                const fields = await transactionManager.getRepository(DynamicFormField).find({
                    where: { formId },
                    order: { displayOrder: 'ASC' }
                });

                for (const field of fields) {
                    let valueStr = values[field.name];
                    if (field.isReadOnly && field.defaultValueExpression) {
                        let evaluated = field.defaultValueExpression;
                        if (evaluated.includes('{{CURRENT_DATE_TIME}}')) {
                            const now = new Date();
                            const pad = (n: number) => n.toString().padStart(2, '0');
                            const formatted = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
                            evaluated = evaluated.replace(/\{\{CURRENT_DATE_TIME\}\}/g, formatted);
                        }
                        if (evaluated.includes('{{LOGGED_USER_NAME}}')) {
                            const requester = await userRepo.findOne({ where: { id: requesterUserId } });
                            evaluated = evaluated.replace(/\{\{LOGGED_USER_NAME\}\}/g, requester?.name || 'Usuario');
                        }
                        if (evaluated.includes('{{LOGGED_USER_EMAIL}}')) {
                            const requester = await userRepo.findOne({ where: { id: requesterUserId } });
                            evaluated = evaluated.replace(/\{\{LOGGED_USER_EMAIL\}\}/g, requester?.email || '');
                        }
                        if (evaluated.includes('{{LOGGED_USER_AREA}}')) {
                            const requester = await userRepo.findOne({ 
                                where: { id: requesterUserId }, 
                                relations: ['team'] 
                            });
                            evaluated = evaluated.replace(/\{\{LOGGED_USER_AREA\}\}/g, requester?.team?.name || '');
                        }
                        valueStr = evaluated;
                    }
                    if (valueStr !== undefined && valueStr !== null) {
                        const fieldValue = valRepo.create({
                            submissionId: savedSubmission.id,
                            fieldId: field.id,
                            value: String(valueStr)
                        });
                        await valRepo.save(fieldValue);
                    }
                }

                // Create child submissions for each selected area
                if (targetFormIds && targetFormIds.length > 0) {
                    for (const targetFormId of targetFormIds) {
                        const targetForm = await transactionManager.getRepository(DynamicForm).findOne({ where: { id: targetFormId } });
                        if (!targetForm) continue;

                        const childSub = subRepo.create({
                            formId: targetFormId,
                            requesterUserId,
                            parentSubmissionId: savedSubmission.id,
                            status: 'Pending'
                        });
                        const savedChildSub = await subRepo.save(childSub);

                        const firstStage = await stageRepo.findOne({
                            where: { formId: targetFormId, stepOrder: 1, isDeleted: false }
                        });

                        if (firstStage) {
                            savedChildSub.currentStageId = firstStage.id;
                            savedChildSub.status = 'In Progress';
                            await subRepo.save(savedChildSub);

                            // Create initial stage workflow entry using standard stage resolution
                            await this.createStageStates(transactionManager, savedChildSub, firstStage);
                        }
                    }
                }
                return savedSubmission;
            }

            // --- NORMAL SUBMISSION LOGIC ---
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
                    let evaluated = field.defaultValueExpression;

                    if (evaluated.includes('{{CURRENT_DATE_TIME}}')) {
                        const now = new Date();
                        const pad = (n: number) => n.toString().padStart(2, '0');
                        const formatted = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
                        evaluated = evaluated.replace(/\{\{CURRENT_DATE_TIME\}\}/g, formatted);
                    }
                    if (evaluated.includes('{{LOGGED_USER_NAME}}')) {
                        const requester = await userRepo.findOne({ where: { id: requesterUserId } });
                        const name = requester?.name || 'Usuario';
                        evaluated = evaluated.replace(/\{\{LOGGED_USER_NAME\}\}/g, name);
                    }
                    if (evaluated.includes('{{LOGGED_USER_EMAIL}}')) {
                        const requester = await userRepo.findOne({ where: { id: requesterUserId } });
                        const email = requester?.email || '';
                        evaluated = evaluated.replace(/\{\{LOGGED_USER_EMAIL\}\}/g, email);
                    }
                    if (evaluated.includes('{{LOGGED_USER_AREA}}')) {
                        const requester = await userRepo.findOne({ 
                            where: { id: requesterUserId }, 
                            relations: ['team'] 
                        });
                        const area = requester?.team?.name || '';
                        evaluated = evaluated.replace(/\{\{LOGGED_USER_AREA\}\}/g, area);
                    }
                    valueStr = evaluated;
                }

                if (valueStr !== undefined && valueStr !== null) {
                    const fieldValue = valRepo.create({
                        submissionId: savedSubmission.id,
                        fieldId: field.id,
                        value: String(valueStr)
                    });
                    await valRepo.save(fieldValue);
                }
            }

            // Find first stage in workflow (stepOrder = 1)
            const firstStage = await stageRepo.findOne({
                where: { formId, stepOrder: 1, isDeleted: false }
            });

            if (firstStage) {
                savedSubmission.currentStageId = firstStage.id;
                savedSubmission.status = 'In Progress';
                await subRepo.save(savedSubmission);

                // Resolve assignee
                let assigneeUserId: number | null = null;
                if (firstStage.assigneeType === 'specific_user') {
                    assigneeUserId = firstStage.assigneeUserId;
                } else if (firstStage.assigneeType === 'requester') {
                    assigneeUserId = requesterUserId;
                } else if (firstStage.assigneeType === 'requester_boss') {
                    const requester = await userRepo.findOne({ where: { id: requesterUserId } });
                    assigneeUserId = requester?.bossId || firstStage.assigneeUserId || 1; // Fallback to admin/specific_user if no boss
                } else if (firstStage.assigneeType === 'previous_stage_actioner') {
                    assigneeUserId = requesterUserId;
                } else if (firstStage.assigneeType === 'previous_stage_team_random') {
                    const requester = await userRepo.findOne({ where: { id: requesterUserId } });
                    if (requester?.teamId) {
                        assigneeUserId = await this.resolveTeamUser(AppDataSource.manager, requester.teamId, 'random', !!firstStage.excludeTeamLeader, requesterUserId);
                    } else {
                        assigneeUserId = requesterUserId;
                    }
                } else if (firstStage.assigneeType === 'team_leader' && firstStage.assigneeTeamId) {
                    assigneeUserId = await this.resolveTeamUser(AppDataSource.manager, firstStage.assigneeTeamId, 'leader');
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
        const stateRepo = AppDataSource.getRepository(DynamicSubmissionWorkflowState);
        const subRepo = AppDataSource.getRepository(DynamicFormSubmission);

        // 1. Find all submissions where user was requester, assigned, or actioner
        const states = await stateRepo.find({
            where: [
                { assignedUserId: userId },
                { actionedByUserId: userId }
            ],
            select: ['submissionId']
        });
        const directSubIds = new Set<number>(states.map(s => s.submissionId).filter(Boolean));

        const userCreatedSubs = await subRepo.find({
            where: { requesterUserId: userId },
            select: ['id']
        });
        userCreatedSubs.forEach(s => directSubIds.add(s.id));

        if (directSubIds.size === 0) {
            return [];
        }

        // 2. Expand all directly participated submissions to include their full submission trees
        const allTreeIds = new Set<number>();
        for (const subId of directSubIds) {
            const tree = await this.getSubmissionTreeIds(subId);
            tree.forEach(id => allTreeIds.add(id));
        }

        let submissions = await subRepo.find({
            where: { id: In(Array.from(allTreeIds)) },
            relations: ['form', 'currentStage', 'workflow'],
            order: { createdAt: 'DESC' }
        });

        // Exclude only pure initial entry dummy containers that had no workflow and only spawned child teams
        const stateCounts = await stateRepo.createQueryBuilder("state")
            .select("state.submissionId", "subId")
            .addSelect("COUNT(state.id)", "cnt")
            .where("state.submissionId IN (:...ids)", { ids: Array.from(allTreeIds) })
            .groupBy("state.submissionId")
            .getRawMany();
        const subIdsWithStates = new Set<number>(stateCounts.map(r => Number(r.subId)));

        submissions = submissions.filter(s => {
            // Keep if it has workflow states, or has an active workflow/stage, or has no children
            const hasStates = subIdsWithStates.has(s.id);
            const hasWorkflow = !!(s.workflowId || s.currentStageId);
            return hasStates || hasWorkflow || s.parentSubmissionId !== null;
        });

        // Deduplicate submissions by group/tree so each main branch request appears once
        const seenDisplayKeys = new Set<string>();
        const distinctSubmissions: DynamicFormSubmission[] = [];
        for (const sub of submissions) {
            // If this is a child subflow with a parent, prioritize the parent submission card if the parent has states
            const key = `${sub.id}`;
            if (!seenDisplayKeys.has(key)) {
                seenDisplayKeys.add(key);
                distinctSubmissions.push(sub);
            }
        }

        const results = await Promise.all(distinctSubmissions.map(async (sub) => {
            let assigneeName = 'N/A';
            let assigneeEmail: string | undefined = undefined;
            let displayStageName = sub.currentStage ? sub.currentStage.name : (sub.status === 'Completed' ? 'Completado' : sub.status);

            // Fetch any currently pending states for this submission (generic for root stages and all subflows)
            const activeStates = await stateRepo.find({
                where: { submissionId: sub.id, status: 'Pending' },
                relations: ['assignedUser', 'stage', 'stage.workflow']
            });

            let users = activeStates.map(s => s.assignedUser).filter(Boolean);

            if (users.length === 0) {
                const childSubs = await subRepo.find({
                    where: { parentSubmissionId: sub.id, status: Not('Completed') }
                });
                const childSubIds = childSubs.map(cs => cs.id);
                if (childSubIds.length > 0) {
                    const childActiveStates = await stateRepo.find({
                        where: { submissionId: In(childSubIds), status: 'Pending' },
                        relations: ['assignedUser']
                    });
                    users = childActiveStates.map(s => s.assignedUser).filter(Boolean);
                }
            }

            if (users.length > 0) {
                assigneeName = users.map(u => u.name).join(', ');
                assigneeEmail = users.map(u => u.email).join(', ');
            }

            // If the active state belongs to an invoked sub-flow, display the composite stage name
            if (activeStates.length > 0 && activeStates[0].stage) {
                const activeStage = activeStates[0].stage;
                if (activeStage.workflowId && sub.workflowId && activeStage.workflowId !== sub.workflowId && activeStage.workflow) {
                    const parentStageName = sub.currentStage?.name || 'Subflujo';
                    displayStageName = `${parentStageName} (${activeStage.workflow.name}: ${activeStage.name})`;
                }
            }

            return {
                id: sub.id,
                formName: sub.form ? sub.form.name : 'Solicitud',
                createdAt: sub.createdAt,
                stageName: displayStageName,
                status: sub.status,
                assigneeName,
                assigneeEmail,
                consecutive: sub.consecutive,
                icon: sub.form ? sub.form.icon : undefined
            };
        }));

        return results;
    }

    async getSubmissionTreeIds(submissionId: number): Promise<number[]> {
        const subRepo = AppDataSource.getRepository(DynamicFormSubmission);
        let rootId = submissionId;
        const visitedUp = new Set<number>();
        while (rootId && !visitedUp.has(rootId)) {
            visitedUp.add(rootId);
            const curr: any = await subRepo.findOne({ where: { id: rootId } });
            if (curr && curr.parentSubmissionId) {
                rootId = curr.parentSubmissionId;
            } else {
                break;
            }
        }

        const allTreeIds = new Set<number>([rootId]);
        const queue = [rootId];
        while (queue.length > 0) {
            const pId = queue.shift()!;
            const children = await subRepo.find({ where: { parentSubmissionId: pId } });
            for (const child of children) {
                if (!allTreeIds.has(child.id)) {
                    allTreeIds.add(child.id);
                    queue.push(child.id);
                }
            }
        }

        return Array.from(allTreeIds);
    }

    async getAncestorSubmissions(submissionId: number): Promise<DynamicFormSubmission[]> {
        const subRepo = AppDataSource.getRepository(DynamicFormSubmission);
        const ancestors: DynamicFormSubmission[] = [];
        let currId: number | null = submissionId;
        const visited = new Set<number>();

        while (currId && !visited.has(currId)) {
            visited.add(currId);
            const curr: any = await subRepo.findOne({
                where: { id: currId },
                relations: ['form']
            });
            if (curr && curr.parentSubmissionId) {
                const parent = await subRepo.findOne({
                    where: { id: curr.parentSubmissionId },
                    relations: ['form']
                });
                if (parent) {
                    ancestors.unshift(parent);
                    currId = parent.id;
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        return ancestors;
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

        const treeIds = await this.getSubmissionTreeIds(submissionId);

        const allStatesToInclude = await stateRepo.find({
            where: { submissionId: In(treeIds) },
            relations: ['stage', 'stage.workflow', 'actionedByUser', 'assignedUser', 'stage.formToFill', 'stage.formToFill.fields', 'customFormToFill', 'customFormToFill.fields', 'submission', 'submission.form'],
            order: { id: 'ASC' }
        });

        const allValuesToInclude = await valRepo.find({
            where: { submissionId: In(treeIds) },
            relations: ['field', 'field.form']
        });

        const entryValues = allValuesToInclude.filter(v => v && v.field && v.field.formId === sub.formId);
        const stageValues = allValuesToInclude.filter(v => v && v.field && v.field.formId !== sub.formId);

        // Determine if next stage query exists to identify final stage
        const wfId = sub.workflowId || (sub.currentStage ? sub.currentStage.workflowId : null) || (sub.form ? sub.form.workflowId : null);
        let nextStageQuery = AppDataSource.getRepository(DynamicWorkflowStage)
            .createQueryBuilder("stage")
            .where("stage.stepOrder > :stepOrder", { stepOrder: sub.currentStage?.stepOrder || 0 })
            .andWhere("stage.isDeleted = :isDeleted", { isDeleted: false });

        if (wfId) {
            nextStageQuery = nextStageQuery.andWhere("(stage.workflowId = :wfId OR (stage.workflowId IS NULL AND stage.formId = :formId))", { wfId, formId: sub.formId });
        } else {
            nextStageQuery = nextStageQuery.andWhere("stage.formId = :formId", { formId: sub.formId });
        }
        const nextStageTemp = sub.currentStage ? await nextStageQuery.orderBy("stage.stepOrder", "ASC").getOne() : null;
        const isFinalStage = !nextStageTemp;

         const historyStages = allStatesToInclude.map((cState) => {
             const resolvedForm = cState.customFormToFill || cState.stage?.formToFill;
             const resolvedFormId = cState.customFormIdToFill || cState.stage?.formIdToFill;
             const stageVals = resolvedFormId 
                 ? allValuesToInclude.filter(v => v && v.field && v.field.formId === resolvedFormId && (v.workflowStateId === cState.id || !v.workflowStateId))
                 : allValuesToInclude.filter(v => v && v.field && v.workflowStateId === cState.id);
             const user = cState.actionedByUser || cState.assignedUser;
             
             let displayName = cState.stage ? cState.stage.name : 'Etapa';
             if (cState.stage?.workflow && sub.workflowId && cState.stage.workflowId !== sub.workflowId) {
                 displayName = `${cState.stage.workflow.name}: ${displayName}`;
             } else if (cState.submissionId !== sub.id && (cState as any).submission?.form) {
                 displayName = `${(cState as any).submission.form.name}: ${displayName}`;
             }

             let stateStatus = cState.status;
             if (cState.status === 'Pending') {
                 if (sub.status === 'Pending Consecutive' && isFinalStage) {
                     stateStatus = 'Approved';
                 } else {
                     stateStatus = 'Pending';
                 }
             }

             let formName = resolvedForm ? resolvedForm.name : displayName;
             if (!resolvedForm && stageVals.length > 0) {
                 const uniqueFormNames = Array.from(new Set(stageVals.map(sv => sv.field?.form?.name).filter(Boolean)));
                 if (uniqueFormNames.length > 0) {
                     formName = uniqueFormNames.join(', ');
                 }
             }
 
             return {
                 stageName: displayName,
                 formName: formName,
                 actionedByUserName: user?.name || 'N/A',
                 actionedByUserEmail: user?.email || 'N/A',
                 actionedAt: cState.updatedAt,
                 status: stateStatus,
                 notes: cState.notes,
                 values: (() => {
                     if (resolvedForm && resolvedForm.fields) {
                          const sortedFields = resolvedForm.fields.sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
                         return sortedFields.map((field: any) => {
                             let parsedMeta = field.metadata;
                             if (parsedMeta && typeof parsedMeta === 'string') {
                                 try { parsedMeta = JSON.parse(parsedMeta); } catch(e) {}
                             }
                             if (field.type === 'section_header') {
                                 return {
                                     label: field.label,
                                     value: '',
                                     fieldType: 'section_header',
                                     metadata: parsedMeta || {}
                                 };
                             }
                             const valObj = stageVals.find(sv => sv.fieldId === field.id);
                             if (valObj) {
                                 return {
                                     label: field.label,
                                     value: valObj.value,
                                     fieldType: field.type,
                                     metadata: parsedMeta || {}
                                 };
                             }
                             return null;
                         }).filter(Boolean);
                     } else if (stageVals.length > 0) {
                         const formGroups = new Map<number, { formName: string; vals: typeof stageVals }>();
                         stageVals.forEach(sv => {
                             const fId = sv.field?.formId || 0;
                             const fName = sv.field?.form?.name || 'Formulario';
                             if (!formGroups.has(fId)) {
                                 formGroups.set(fId, { formName: fName, vals: [] });
                             }
                             formGroups.get(fId)!.vals.push(sv);
                         });

                         const resultValues: any[] = [];
                         formGroups.forEach((grp) => {
                             resultValues.push({
                                 label: grp.formName,
                                 value: '',
                                 fieldType: 'section_header',
                                 metadata: {}
                             });
                             grp.vals.sort((a, b) => (a.field?.displayOrder || 0) - (b.field?.displayOrder || 0)).forEach(v => {
                                 let parsedMeta = v.field?.metadata;
                                 if (parsedMeta && typeof parsedMeta === 'string') {
                                     try { parsedMeta = JSON.parse(parsedMeta); } catch(e) {}
                                 }
                                 resultValues.push({
                                     label: v.field?.label || 'Campo',
                                     value: v.value,
                                     fieldType: v.field?.type || 'text',
                                     metadata: parsedMeta || {}
                                 });
                             });
                         });

                         return resultValues;
                     } else {
                         return [];
                     }
                 })()
             };
         });

        const parentSubmissions = await this.getAncestorSubmissions(sub.id);
        const initialParentSubmissions = parentSubmissions.filter(p => p.form && (p.form.isInitialForm || p.form.isEntryForm || !p.parentSubmissionId));
        const parentSubIds = initialParentSubmissions.map(p => p.id);
        const parentValues: any[] = [];
        if (parentSubIds.length > 0) {
            const pVals = await valRepo.find({
                where: { submissionId: In(parentSubIds), workflowStateId: IsNull() },
                relations: ['field', 'field.form']
            });
            const seenParentFieldIds = new Set<number>();
            for (const v of pVals) {
                if (v && v.field && (v.field.form?.isInitialForm || v.field.form?.isEntryForm) && !seenParentFieldIds.has(v.field.id)) {
                    seenParentFieldIds.add(v.field.id);
                    let parsedMeta = v.field.metadata;
                    if (parsedMeta && typeof parsedMeta === 'string') {
                        try { parsedMeta = JSON.parse(parsedMeta); } catch(e) {}
                    }
                    parentValues.push({
                        label: v.field.label,
                        value: v.value,
                        fieldType: v.field.type,
                        metadata: parsedMeta || {},
                        formName: v.field.form ? v.field.form.name : 'Inicial'
                    });
                }
            }
        }

        // Deduplicate entryValues by fieldId so no field repeats
        const uniqueEntryValues: any[] = [];
        const seenFieldIds = new Set<number>();
        for (const v of entryValues) {
            if (v && v.field && !seenFieldIds.has(v.field.id)) {
                seenFieldIds.add(v.field.id);
                uniqueEntryValues.push(v);
            }
        }

        return {
            id: sub.id,
            formName: sub.form.name,
            createdAt: sub.createdAt,
            status: sub.status,
            consecutive: sub.consecutive,
            stageName: sub.currentStage ? sub.currentStage.name : 'Completado',
            requesterName: sub.requesterUser ? sub.requesterUser.name : 'Usuario',
            requesterEmail: sub.requesterUser ? sub.requesterUser.email : '',
            values: uniqueEntryValues.map(v => {
                 let parsedMeta = v.field.metadata;
                 if (parsedMeta && typeof parsedMeta === 'string') {
                     try { parsedMeta = JSON.parse(parsedMeta); } catch(e) {}
                 }
                 return {
                     label: v.field.label,
                     value: v.value,
                     fieldType: v.field.type,
                     metadata: parsedMeta || {}
                 };
             }),
            parentValues,
            stageValues: stageValues.map(v => {
                 let parsedMeta = v.field.metadata;
                 if (parsedMeta && typeof parsedMeta === 'string') {
                     try { parsedMeta = JSON.parse(parsedMeta); } catch(e) {}
                 }
                 return {
                     label: v.field.label,
                     value: v.value,
                     fieldType: v.field.type,
                     metadata: parsedMeta || {},
                     formName: v.field.form ? v.field.form.name : 'Etapa'
                 };
             }),
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
        const wfRepo = AppDataSource.getRepository(DynamicWorkflow);
        
        let targetWfId = data.workflowId || null;
        if (!targetWfId && data.isEntryForm && !data.isInitialForm) {
            const wfName = `Flujo: ${data.name}`;
            let existingWf = await wfRepo.findOne({ where: { name: wfName } });
            if (!existingWf) {
                existingWf = await wfRepo.save(wfRepo.create({
                    name: wfName,
                    description: data.description || `Flujo para ${data.name}`,
                    isActive: true
                }));
            }
            targetWfId = existingWf.id;
        }

        const form = repo.create({
            name: data.name,
            description: data.description,
            isEntryForm: data.isEntryForm ?? true,
            isInitialForm: data.isInitialForm ?? false,
            isActive: data.isActive ?? true,
            responsible: data.responsible,
            role: data.role,
            icon: data.icon,
            requireConsecutive: data.requireConsecutive ?? true,
            displayOrder: data.displayOrder ?? 0,
            metadata: data.metadata,
            workflowId: targetWfId
        });
        return await repo.save(form);
    }

    async adminUpdateForm(id: number, data: Partial<DynamicForm>) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        const repo = AppDataSource.getRepository(DynamicForm);
        const form = await repo.findOne({ where: { id } });
        if (!form) throw new Error('Formulario no encontrado');
        
        const updateData: Partial<DynamicForm> = {};
        if (data.isInitialForm !== undefined) updateData.isInitialForm = Boolean(data.isInitialForm);
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.isEntryForm !== undefined) updateData.isEntryForm = Boolean(data.isEntryForm);
        if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
        if (data.responsible !== undefined) updateData.responsible = data.responsible;
        if (data.role !== undefined) updateData.role = data.role;
        if (data.icon !== undefined) updateData.icon = data.icon;
        if (data.requireConsecutive !== undefined) updateData.requireConsecutive = Boolean(data.requireConsecutive);
        if (data.displayOrder !== undefined) updateData.displayOrder = Number(data.displayOrder);
        if (data.metadata !== undefined) updateData.metadata = data.metadata;
        if (data.workflowId !== undefined) updateData.workflowId = data.workflowId;

        await repo.update({ id }, updateData);
        return await repo.findOne({ where: { id } });
    }

    async adminDeleteForm(id: number, physicalDelete: boolean = false) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        
        if (physicalDelete) {
            return await AppDataSource.transaction(async (manager) => {
                // 1. Unlink form from any workflow stage pointing to it as form to fill
                await manager.query(`UPDATE DynamicWorkflowStages SET FormIdToFill = NULL WHERE FormIdToFill = ${id};`);

                // 2. Unlink any submission parent/children and clear currentStageId
                await manager.query(`
                    UPDATE DynamicFormSubmissions 
                    SET ParentSubmissionId = NULL, CurrentStageId = NULL 
                    WHERE FormId = ${id} OR ParentSubmissionId IN (SELECT Id FROM DynamicFormSubmissions WHERE FormId = ${id});
                `);

                // 3. Nullify WorkflowStateId on DynamicFormFieldValues if column exists
                await manager.query(`
                    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('DynamicFormFieldValues') AND name = 'WorkflowStateId')
                    BEGIN
                        UPDATE DynamicFormFieldValues SET WorkflowStateId = NULL 
                        WHERE FieldId IN (SELECT Id FROM DynamicFormFields WHERE FormId = ${id})
                           OR SubmissionId IN (SELECT Id FROM DynamicFormSubmissions WHERE FormId = ${id});
                    END
                `);

                // 4. Delete DynamicFormFieldValues
                await manager.query(`
                    DELETE FROM DynamicFormFieldValues 
                    WHERE FieldId IN (SELECT Id FROM DynamicFormFields WHERE FormId = ${id})
                       OR SubmissionId IN (SELECT Id FROM DynamicFormSubmissions WHERE FormId = ${id});
                `);

                // 5. Delete DynamicSubmissionWorkflowState
                await manager.query(`
                    DELETE FROM DynamicSubmissionWorkflowState 
                    WHERE SubmissionId IN (SELECT Id FROM DynamicFormSubmissions WHERE FormId = ${id})
                       OR StageId IN (SELECT Id FROM DynamicWorkflowStages WHERE FormId = ${id});
                `);

                // 6. Delete DynamicFormSubmissions
                await manager.query(`DELETE FROM DynamicFormSubmissions WHERE FormId = ${id};`);

                // 7. Delete DynamicFormFields
                await manager.query(`DELETE FROM DynamicFormFields WHERE FormId = ${id};`);

                // 8. Delete DynamicWorkflowStages where FormId is this form
                await manager.query(`DELETE FROM DynamicWorkflowStages WHERE FormId = ${id};`);

                // 9. Unlink workflowId on this form
                await manager.query(`UPDATE DynamicForms SET WorkflowId = NULL WHERE Id = ${id};`);

                // 10. Delete the form
                await manager.query(`DELETE FROM DynamicForms WHERE Id = ${id};`);

                return { id, deleted: true };
            });
        } else {
            const repo = AppDataSource.getRepository(DynamicForm);
            await repo.update({ id }, { isActive: false });
            return await repo.findOne({ where: { id } });
        }
    }

    async adminSaveFields(formId: number, fields: Partial<DynamicFormField>[]) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        return await AppDataSource.transaction(async (manager) => {
            const fieldRepo = manager.getRepository(DynamicFormField);

            // Fetch existing field IDs to know what to delete
            const existingFields = await fieldRepo.find({ where: { formId } });
            const inputIds = fields.map(f => f.id).filter(id => !!id) as number[];
            
            // Delete fields that are not in the input list (Cascade delete values and field itself)
            const fieldsToDelete = existingFields.filter(ef => !inputIds.includes(ef.id));
            if (fieldsToDelete.length > 0) {
                const ids = fieldsToDelete.map(f => f.id);
                await manager.getRepository(DynamicFormFieldValue).delete({ fieldId: In(ids) });
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
                        isActive: f.isActive ?? true,
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
                    if (f.isActive !== undefined) fieldEntity.isActive = f.isActive;
                    if (f.defaultValueExpression !== undefined) fieldEntity.defaultValueExpression = f.defaultValueExpression;
                    if (f.displayOrder !== undefined) fieldEntity.displayOrder = f.displayOrder;
                    if (f.metadata !== undefined) fieldEntity.metadata = f.metadata ? (typeof f.metadata === 'string' ? f.metadata : JSON.stringify(f.metadata)) : null;
                }

                savedFields.push(await fieldRepo.save(fieldEntity));
            }

            return savedFields;
        });
    }

    // --- ADMIN WORKFLOWS (INDEPENDENT) ---
    async adminGetWorkflows() {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        return await AppDataSource.getRepository(DynamicWorkflow).find({
            where: { isActive: true },
            order: { name: 'ASC' }
        });
    }

    async adminCreateWorkflow(data: Partial<DynamicWorkflow>) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        const repo = AppDataSource.getRepository(DynamicWorkflow);
        const wf = repo.create({
            name: data.name,
            description: data.description,
            requireConsecutive: data.requireConsecutive !== undefined ? Boolean(data.requireConsecutive) : true,
            isActive: data.isActive ?? true
        });
        return await repo.save(wf);
    }

    async adminUpdateWorkflow(id: number, data: Partial<DynamicWorkflow>) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        const repo = AppDataSource.getRepository(DynamicWorkflow);
        const wf = await repo.findOne({ where: { id } });
        if (!wf) throw new Error('Flujo de trabajo no encontrado');
        if (data.name !== undefined) wf.name = data.name;
        if (data.description !== undefined) wf.description = data.description;
        if (data.requireConsecutive !== undefined) wf.requireConsecutive = Boolean(data.requireConsecutive);
        if (data.isActive !== undefined) wf.isActive = data.isActive;
        return await repo.save(wf);
    }

    async adminDeleteWorkflow(id: number) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        const repo = AppDataSource.getRepository(DynamicWorkflow);
        const wf = await repo.findOne({ where: { id } });
        if (!wf) throw new Error('Flujo de trabajo no encontrado');

        await AppDataSource.getRepository(DynamicForm).update({ workflowId: id }, { workflowId: null });
        await repo.update({ id }, { isActive: false });
        return { id, deleted: true };
    }

    async adminGetWorkflowStages(workflowId: number) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        const stages = await AppDataSource.getRepository(DynamicWorkflowStage).find({
            where: [
                { workflowId, isDeleted: false },
                { formId: workflowId, isDeleted: false }
            ],
            relations: ['assigneeUser', 'assigneeTeam', 'formToFill', 'rejectionTargetUser', 'rejectionTargetTeam'],
            order: { stepOrder: 'ASC' }
        });
        return stages.map(s => {
            let parsedIds: any = [];
            if (s.assigneeUserIds) {
                try {
                    parsedIds = JSON.parse(s.assigneeUserIds);
                } catch(e) {}
            }
            const isMultiForms = (parsedIds && !Array.isArray(parsedIds) && parsedIds.multiFormsConfig && parsedIds.multiFormsConfig.length > 0)
                || (Array.isArray(parsedIds) && parsedIds.length > 0 && (parsedIds[0].sourceFormId !== undefined || parsedIds[0].targetFormIdToFill !== undefined || parsedIds[0].targetSubflowFormId !== undefined || parsedIds[0].targetSubflowWorkflowId !== undefined));
            return {
                ...s,
                formIdToFill: isMultiForms ? -1 : s.formIdToFill,
                assigneeUserIds: parsedIds
            };
        });
    }

    async adminSaveWorkflowStages(workflowId: number, stages: Partial<DynamicWorkflowStage>[]) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        return await AppDataSource.transaction(async (manager) => {
            const stageRepo = manager.getRepository(DynamicWorkflowStage);

            // Fetch existing stages for this workflow
            const existingStages = await stageRepo.find({
                where: [
                    { workflowId },
                    { formId: workflowId }
                ]
            });
            const inputIds = stages.map(s => s.id).filter(id => !!id) as number[];

            // Soft delete stages that are not in the input list
            const stagesToDelete = existingStages.filter(es => !inputIds.includes(es.id));
            if (stagesToDelete.length > 0) {
                for (const es of stagesToDelete) {
                    es.isDeleted = true;
                    await stageRepo.save(es);
                }
            }

            // Insert or Update stages
            const savedStages = [];
            for (let i = 0; i < stages.length; i++) {
                const s = stages[i];
                let stageEntity = existingStages.find(es => es.id === s.id);
                const dbFormIdToFill = (s.formIdToFill && s.formIdToFill > 0) ? s.formIdToFill : null;

                if (!stageEntity) {
                    stageEntity = stageRepo.create({
                        workflowId,
                        formId: workflowId, // Compatibility
                        isDeleted: false,
                        name: s.name || `Etapa ${i + 1}`,
                        description: s.description,
                        stepOrder: s.stepOrder ?? (i + 1),
                        assigneeType: s.assigneeType || 'specific_user',
                        assigneeUserId: s.assigneeUserId || null,
                        assigneeTeamId: s.assigneeTeamId || null,
                        formIdToFill: dbFormIdToFill,
                        rejectionTargetType: s.rejectionTargetType || 'previous_sender',
                        rejectionTargetUserId: s.rejectionTargetUserId || null,
                        rejectionTargetTeamId: s.rejectionTargetTeamId || null,
                        requireCommentOnApprove: !!s.requireCommentOnApprove,
                        excludeTeamLeader: !!s.excludeTeamLeader,
                        assigneeUserIds: s.assigneeUserIds ? JSON.stringify(s.assigneeUserIds) : null
                    });
                } else {
                    stageEntity.isDeleted = false; // Reactivate if it was soft-deleted
                    stageEntity.workflowId = workflowId;
                    if (s.name !== undefined) stageEntity.name = s.name;
                    if (s.description !== undefined) stageEntity.description = s.description;
                    if (s.stepOrder !== undefined) stageEntity.stepOrder = s.stepOrder;
                    if (s.assigneeType !== undefined) stageEntity.assigneeType = s.assigneeType;
                    if (s.assigneeUserId !== undefined) stageEntity.assigneeUserId = s.assigneeUserId;
                    if (s.assigneeTeamId !== undefined) stageEntity.assigneeTeamId = s.assigneeTeamId;
                    if (s.formIdToFill !== undefined) stageEntity.formIdToFill = dbFormIdToFill;
                    if (s.rejectionTargetType !== undefined) stageEntity.rejectionTargetType = s.rejectionTargetType;
                    if (s.rejectionTargetUserId !== undefined) stageEntity.rejectionTargetUserId = s.rejectionTargetUserId;
                    if (s.rejectionTargetTeamId !== undefined) stageEntity.rejectionTargetTeamId = s.rejectionTargetTeamId;
                    if (s.requireCommentOnApprove !== undefined) stageEntity.requireCommentOnApprove = s.requireCommentOnApprove;
                    if (s.excludeTeamLeader !== undefined) stageEntity.excludeTeamLeader = !!s.excludeTeamLeader;
                    if (s.assigneeUserIds !== undefined) stageEntity.assigneeUserIds = s.assigneeUserIds ? JSON.stringify(s.assigneeUserIds) : null;
                }

                savedStages.push(await stageRepo.save(stageEntity));
            }

            return savedStages;
        });
    }

    async adminGetStages(formId: number) {
        return this.adminGetWorkflowStages(formId);
    }

    async adminSaveStages(formId: number, stages: Partial<DynamicWorkflowStage>[]) {
        return this.adminSaveWorkflowStages(formId, stages);
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

            const wfId = state.submission.workflowId || state.stage?.workflowId || (state.submission.form ? state.submission.form.workflowId : null);
            const wf = state.submission.workflow || (wfId ? await AppDataSource.getRepository(DynamicWorkflow).findOne({ where: { id: wfId } }) : null);
            let nextStageQuery = AppDataSource.getRepository(DynamicWorkflowStage)
                .createQueryBuilder("stage")
                .where("stage.stepOrder > :stepOrder", { stepOrder: state.stage.stepOrder })
                .andWhere("stage.isDeleted = :isDeleted", { isDeleted: false });

            if (wfId) {
                nextStageQuery = nextStageQuery.andWhere("(stage.workflowId = :wfId OR (stage.workflowId IS NULL AND stage.formId = :formId))", { wfId, formId: state.submission.formId });
            } else {
                nextStageQuery = nextStageQuery.andWhere("stage.formId = :formId", { formId: state.submission.formId });
            }
            const nextStage = await nextStageQuery.orderBy("stage.stepOrder", "ASC").getOne();
            const isFinalStage = !nextStage;

            const treeIds = await this.getSubmissionTreeIds(state.submissionId);
            const allStatesToInclude = await stateRepo.find({
                where: { submissionId: In(treeIds) },
                relations: ['stage', 'stage.workflow', 'actionedByUser', 'assignedUser', 'stage.formToFill', 'stage.formToFill.fields', 'customFormToFill', 'customFormToFill.fields', 'submission', 'submission.form'],
                order: { id: 'ASC' }
            });
            const allValuesToInclude = await valRepo.find({
                where: { submissionId: In(treeIds) },
                relations: ['field', 'field.form']
            });

            const historyStages = allStatesToInclude.map((cState) => {
                const resolvedForm = cState.customFormToFill || cState.stage?.formToFill;
                const resolvedFormId = cState.customFormIdToFill || cState.stage?.formIdToFill;
                const stageVals = resolvedFormId 
                    ? allValuesToInclude.filter(v => v && v.field && v.field.formId === resolvedFormId && (v.workflowStateId === cState.id || !v.workflowStateId))
                    : allValuesToInclude.filter(v => v && v.field && v.workflowStateId === cState.id);
                const user = cState.actionedByUser || cState.assignedUser;
                
                let displayName = cState.stage ? cState.stage.name : 'Etapa';
                if (cState.stage?.workflow && state.submission.workflowId && cState.stage.workflowId !== state.submission.workflowId) {
                    displayName = `${cState.stage.workflow.name}: ${displayName}`;
                } else if (cState.submissionId !== state.submissionId && (cState as any).submission?.form) {
                    displayName = `${(cState as any).submission.form.name}: ${displayName}`;
                }

                let stateStatus = cState.status;
                if (cState.status === 'Pending') {
                    if (state.submission.status === 'Pending Consecutive' && isFinalStage) {
                        stateStatus = 'Approved';
                    } else {
                        stateStatus = 'Pending';
                    }
                }

                let formName = resolvedForm ? resolvedForm.name : displayName;
                if (!resolvedForm && stageVals.length > 0) {
                    const uniqueFormNames = Array.from(new Set(stageVals.map(sv => sv.field?.form?.name).filter(Boolean)));
                    if (uniqueFormNames.length > 0) {
                        formName = uniqueFormNames.join(', ');
                    }
                }
 
                return {
                    stageName: displayName,
                    formName: formName,
                    actionedByUserName: user?.name || 'N/A',
                    actionedByUserEmail: user?.email || 'N/A',
                    actionedAt: cState.updatedAt,
                    status: stateStatus,
                    notes: cState.notes,
                    values: (() => {
                      if (resolvedForm && resolvedForm.fields) {
                          const sortedFields = resolvedForm.fields.sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
                          return sortedFields.map((field: any) => {
                              let parsedMeta = field.metadata;
                              if (parsedMeta && typeof parsedMeta === 'string') {
                                  try { parsedMeta = JSON.parse(parsedMeta); } catch(e) {}
                              }
                              if (field.type === 'section_header') {
                                  return {
                                      label: field.label,
                                      value: '',
                                      fieldType: 'section_header',
                                      metadata: parsedMeta || {}
                                  };
                              }
                              const valObj = stageVals.find(sv => sv.fieldId === field.id);
                              if (valObj) {
                                  return {
                                      label: field.label,
                                      value: valObj.value,
                                      fieldType: field.type,
                                      metadata: parsedMeta || {}
                                  };
                              }
                              return null;
                          }).filter(Boolean);
                      } else if (stageVals.length > 0) {
                          const formGroups = new Map<number, { formName: string; vals: typeof stageVals }>();
                          stageVals.forEach(sv => {
                              const fId = sv.field?.formId || 0;
                              const fName = sv.field?.form?.name || 'Formulario';
                              if (!formGroups.has(fId)) {
                                  formGroups.set(fId, { formName: fName, vals: [] });
                              }
                              formGroups.get(fId)!.vals.push(sv);
                          });

                          const resultValues: any[] = [];
                          formGroups.forEach((grp) => {
                              resultValues.push({
                                  label: grp.formName,
                                  value: '',
                                  fieldType: 'section_header',
                                  metadata: {}
                              });
                              grp.vals.sort((a, b) => (a.field?.displayOrder || 0) - (b.field?.displayOrder || 0)).forEach(v => {
                                  let parsedMeta = v.field?.metadata;
                                  if (parsedMeta && typeof parsedMeta === 'string') {
                                      try { parsedMeta = JSON.parse(parsedMeta); } catch(e) {}
                                  }
                                  resultValues.push({
                                      label: v.field?.label || 'Campo',
                                      value: v.value,
                                      fieldType: v.field?.type || 'text',
                                      metadata: parsedMeta || {}
                                  });
                              });
                          });

                          return resultValues;
                      } else {
                          return [];
                      }
                  })()
                };
            });

            const parentSubmissions = await this.getAncestorSubmissions(state.submissionId);
            const initialParentSubmissions = parentSubmissions.filter(p => p.form && (p.form.isInitialForm || p.form.isEntryForm || !p.parentSubmissionId));
            const parentSubIds = initialParentSubmissions.map(p => p.id);
            const parentVals: any[] = [];
            if (parentSubIds.length > 0) {
                const pVals = await valRepo.find({
                    where: { submissionId: In(parentSubIds), workflowStateId: IsNull() },
                    relations: ['field', 'field.form']
                });
                const seenParentFieldIds = new Set<number>();
                for (const v of pVals) {
                    if (v && v.field && (v.field.form?.isInitialForm || v.field.form?.isEntryForm) && !seenParentFieldIds.has(v.field.id)) {
                        seenParentFieldIds.add(v.field.id);
                        let parsedMeta = v.field.metadata;
                        if (parsedMeta && typeof parsedMeta === 'string') {
                            try { parsedMeta = JSON.parse(parsedMeta); } catch(e) {}
                        }
                        parentVals.push({
                            label: v.field.label,
                            value: v.value,
                            fieldType: v.field.type,
                            metadata: parsedMeta || {},
                            formName: v.field.form ? v.field.form.name : 'Inicial'
                        });
                    }
                }
            }

            const isCorrection = (state.submission.status === 'Rejected' && state.assignedUserId === state.submission.requesterUserId);
            const parentForms = [];
            if (isCorrection && parentSubmissions.length > 0) {
                const fieldRepo = AppDataSource.getRepository(DynamicFormField);
                for (const pSub of parentSubmissions) {
                    const fields = await fieldRepo.find({
                        where: { formId: pSub.formId }
                    });
                    const pSubVals = await valRepo.find({
                        where: { submissionId: pSub.id },
                        relations: ['field']
                    });

                    const mappedFields = fields.map((f: any) => {
                        const valObj = pSubVals.find(v => v.fieldId === f.id);
                        let parsedMeta = f.metadata;
                        if (parsedMeta && typeof parsedMeta === 'string') {
                            try { parsedMeta = JSON.parse(parsedMeta); } catch(e) {}
                        }
                        return {
                            id: f.id,
                            name: f.name,
                            type: f.type,
                            label: f.label,
                            placeholder: f.placeholder,
                            isRequired: f.isRequired,
                            options: f.options,
                            metadata: parsedMeta,
                            isReadOnly: f.isReadOnly,
                            value: valObj ? valObj.value : ''
                        };
                    });

                    parentForms.push({
                        formId: pSub.formId,
                        formName: pSub.form.name,
                        fields: mappedFields
                    });
                }
            }

            let parsedAssigneeConfig: any = null;
            let isMultiForms = false;
            let cfgList: any[] = [];
            if (state.stage.assigneeUserIds) {
                try {
                    parsedAssigneeConfig = JSON.parse(state.stage.assigneeUserIds);
                    cfgList = Array.isArray(parsedAssigneeConfig) ? parsedAssigneeConfig : (parsedAssigneeConfig.multiFormsConfig || []);
                    if (cfgList.length > 0 && (cfgList[0].sourceFormId !== undefined || cfgList[0].targetFormIdToFill !== undefined)) {
                        const stageApprovedStates = allStatesToInclude.filter((cs: any) => cs.stageId === state.stage.id && cs.status === 'Approved');
                        if (stageApprovedStates.length === 0) {
                            isMultiForms = true;
                        }
                    }
                } catch(e) {}
            }

            const formIdToFill = isMultiForms ? -1 : (state.customFormIdToFill || state.stage.formIdToFill || null);
            const formToFill = state.customFormToFill || state.stage.formToFill || null;
            const stageName = state.stage.name;
            const stageDescription = state.stage.description;

            let availableMultiForms: any[] = [];
            if (isMultiForms && cfgList.length > 0) {
                const sourceFormIds = cfgList.map((m: any) => m.sourceFormId).filter(Boolean);
                if (sourceFormIds.length > 0) {
                    const forms = await AppDataSource.getRepository(DynamicForm).find({
                        where: { id: In(sourceFormIds) },
                        relations: ['fields']
                    });
                    for (const m of cfgList) {
                        const frm = forms.find(f => f.id === m.sourceFormId);
                        if (frm) {
                            availableMultiForms.push({
                                formId: frm.id,
                                formName: frm.name,
                                description: frm.description,
                                fields: (frm.fields || []).sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0)).map((f: any) => {
                                    let parsedMeta = f.metadata;
                                    if (parsedMeta && typeof parsedMeta === 'string') {
                                        try { parsedMeta = JSON.parse(parsedMeta); } catch(e) {}
                                    }
                                    return {
                                        id: f.id,
                                        formId: f.formId,
                                        name: f.name,
                                        label: f.label,
                                        type: f.type,
                                        placeholder: f.placeholder,
                                        description: f.description,
                                        isRequired: f.isRequired,
                                        isReadOnly: f.isReadOnly,
                                        displayOrder: f.displayOrder,
                                        formulaExpression: f.formulaExpression,
                                        visibilityCondition: f.visibilityCondition,
                                        metadata: parsedMeta || {}
                                    };
                                }),
                                targetFormIdToFill: m.targetFormIdToFill,
                                assignedUserId: m.assignedUserId,
                                assignedTeamId: m.assignedTeamId
                            });
                        }
                    }
                }
            }

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
                stageName: stageName,
                stageDescription: stageDescription,
                formIdToFill: formIdToFill,
                formToFill: formToFill,
                availableMultiForms,
                isFinalStage,
                icon: state.submission.form.icon,
                values: values.filter(v => v && v.field && v.field.formId === state.submission.formId).map(v => {
                    let parsedMeta = v.field.metadata;
                    if (parsedMeta && typeof parsedMeta === 'string') {
                        try { parsedMeta = JSON.parse(parsedMeta); } catch(e) {}
                    }
                    return {
                        label: v.field.label,
                        value: v.value,
                        fieldType: v.field.type,
                        metadata: parsedMeta || {}
                    };
                }),
                parentValues: parentVals,
                parentForms,
                stageValues: values.filter(v => v && v.field && v.field.formId !== state.submission.formId).map(v => {
                    let parsedMeta = v.field.metadata;
                    if (parsedMeta && typeof parsedMeta === 'string') {
                        try { parsedMeta = JSON.parse(parsedMeta); } catch(e) {}
                    }
                    return {
                        label: v.field.label,
                        value: v.value,
                        fieldType: v.field.type,
                        metadata: parsedMeta || {},
                        formName: v.field.form ? v.field.form.name : 'Etapa'
                    };
                }),
                submittedValuesRaw,
                requireConsecutive: wf ? (wf.requireConsecutive ?? true) : (state.submission.form ? (state.submission.form.requireConsecutive ?? true) : true),
                requireCommentOnApprove: state.stage ? !!state.stage.requireCommentOnApprove : false,
                historyStages
            });
        }

        return results;
    }

    async resolveTeamUser(
        manager: any, 
        teamId: number, 
        strategy: 'random' | 'workload' | 'first' | 'leader' = 'random',
        excludeLeader: boolean = false,
        previousActionerId?: number
    ): Promise<number> {
        const team = await manager.getRepository(Team).findOne({ where: { id: teamId } });

        if (strategy === 'leader') {
            if (team && team.leaderId) {
                const leaderUser = await manager.getRepository(User).findOne({ where: { id: team.leaderId, status: 1 } });
                if (leaderUser) {
                    return leaderUser.id;
                }
            }
        }

        const teamUsers = await manager.getRepository(User).find({
            where: { teamId, status: 1 }
        });
        if (!teamUsers || teamUsers.length === 0) return 1;

        // If excludeLeader is requested, filter out the team leader and/or previous actioner
        let candidates = teamUsers;
        if (excludeLeader) {
            const leaderUserId = team?.leaderId || previousActionerId;
            const filtered = teamUsers.filter((u: any) => u.id !== leaderUserId);
            if (filtered.length > 0) {
                candidates = filtered;
            }
        }

        if (strategy === 'random') {
            const randomIndex = Math.floor(Math.random() * candidates.length);
            return candidates[randomIndex].id;
        }
        if (strategy === 'first' || strategy === 'leader') {
            return candidates[0].id;
        }
        const stateRepo = manager.getRepository(DynamicSubmissionWorkflowState);
        const workloads = await Promise.all(candidates.map(async (u: any) => {
            const count = await stateRepo.count({
                where: { assignedUserId: u.id, status: 'Pending' }
            });
            return { userId: u.id, count };
        }));
        workloads.sort((a: any, b: any) => a.count - b.count);
        return workloads[0].userId;
    }

    async createStageStates(manager: any, submission: any, targetStage: any) {
        const stateRepo = manager.getRepository(DynamicSubmissionWorkflowState);
        const userRepo = manager.getRepository(User);
        const valRepo = manager.getRepository(DynamicFormFieldValue);

        // 1. If this stage is a subflow stage, directly activate the first stage of the sub-flow on this submission!
        if (targetStage.assigneeType === 'subflow') {
            const subflowWfId = targetStage.formIdToFill;
            const stageRepo = manager.getRepository(DynamicWorkflowStage);

            let subflowStages: any[] = [];
            if (subflowWfId) {
                subflowStages = await stageRepo.find({
                    where: { workflowId: subflowWfId, isDeleted: false },
                    order: { stepOrder: 'ASC' }
                });
            }

            if (subflowStages.length > 0) {
                const firstSubflowStage = subflowStages[0];
                submission.currentStageId = targetStage.id;
                await manager.getRepository(DynamicFormSubmission).save(submission);

                // Recursively activate first stage of the sub-flow directly on this submission!
                await this.createStageStates(manager, submission, firstSubflowStage);
                return;
            }
        }

        // 2. Delete previous values filled for this stage's form (so they start fresh)
        const pastStates = await stateRepo.find({
            where: { submissionId: submission.id, stageId: targetStage.id }
        });
        const pastStateIds = pastStates.map((s: any) => s.id);
        if (pastStateIds.length > 0) {
            await valRepo.delete({ submissionId: submission.id, workflowStateId: In(pastStateIds) });
        }

        // 3. Resolve assignees
        let assigneeMappings: { userId: number, formId: number | null }[] = [];

        if (targetStage.assigneeType === 'multiple_users') {
            if (targetStage.assigneeUserIds) {
                try {
                    const parsed = typeof targetStage.assigneeUserIds === 'string' 
                        ? JSON.parse(targetStage.assigneeUserIds) 
                        : targetStage.assigneeUserIds;
                    if (Array.isArray(parsed)) {
                        assigneeMappings = parsed.map((item: any) => {
                            if (typeof item === 'object' && item !== null) {
                                return {
                                    userId: Number(item.userId),
                                    formId: item.formId ? Number(item.formId) : null
                                };
                            } else {
                                // Backward compatibility
                                return {
                                    userId: Number(item),
                                    formId: null
                                };
                            }
                        });
                    }
                } catch (e) {
                    console.error("Error parsing AssigneeUserIds JSON:", e);
                }
            }
            if (assigneeMappings.length === 0) {
                assigneeMappings = [{ userId: targetStage.assigneeUserId || 1, formId: null }];
            }
        } else if (targetStage.assigneeType === 'team' && targetStage.assigneeTeamId) {
            // Assign to all team members in parallel
            const teamUsers = await userRepo.find({
                where: { teamId: targetStage.assigneeTeamId, status: 1 }
            });
            if (teamUsers.length > 0) {
                assigneeMappings = teamUsers.map((u: any) => ({ userId: u.id, formId: targetStage.formIdToFill || null }));
            } else {
                assigneeMappings = [{ userId: targetStage.assigneeUserId || 1, formId: null }];
            }
        } else {
            let assigneeUserId: number | null = null;
            if (targetStage.assigneeType === 'specific_user') {
                assigneeUserId = targetStage.assigneeUserId;
            } else if (targetStage.assigneeType === 'requester') {
                assigneeUserId = submission.requesterUserId;
            } else if (targetStage.assigneeType === 'requester_boss') {
                const requester = await userRepo.findOne({ where: { id: submission.requesterUserId } });
                assigneeUserId = requester?.bossId || targetStage.assigneeUserId || 1;
            } else if (targetStage.assigneeType === 'previous_stage_actioner') {
                const prevApproved = await stateRepo.findOne({
                    where: { submissionId: submission.id, status: 'Approved' },
                    order: { updatedAt: 'DESC' }
                });
                assigneeUserId = prevApproved?.actionedByUserId || prevApproved?.assignedUserId || submission.requesterUserId;
            } else if (targetStage.assigneeType === 'previous_stage_team_random') {
                const prevApproved = await stateRepo.findOne({
                    where: { submissionId: submission.id, status: 'Approved' },
                    order: { updatedAt: 'DESC' }
                });
                const actionerId = prevApproved?.actionedByUserId || prevApproved?.assignedUserId || submission.requesterUserId;
                if (actionerId) {
                    const actioner = await userRepo.findOne({ where: { id: actionerId } });
                    if (actioner?.teamId) {
                        assigneeUserId = await this.resolveTeamUser(manager, actioner.teamId, 'random', !!targetStage.excludeTeamLeader, actionerId);
                    } else {
                        assigneeUserId = actionerId;
                    }
                } else {
                    assigneeUserId = targetStage.assigneeUserId || submission.requesterUserId || 1;
                }
            } else if (targetStage.assigneeType === 'team_leader' && targetStage.assigneeTeamId) {
                assigneeUserId = await this.resolveTeamUser(manager, targetStage.assigneeTeamId, 'leader');
            } else if (targetStage.assigneeType === 'team_random' && targetStage.assigneeTeamId) {
                assigneeUserId = await this.resolveTeamUser(manager, targetStage.assigneeTeamId, 'random', !!targetStage.excludeTeamLeader);
            } else if (targetStage.assigneeType === 'team_workload' && targetStage.assigneeTeamId) {
                assigneeUserId = await this.resolveTeamUser(manager, targetStage.assigneeTeamId, 'workload', !!targetStage.excludeTeamLeader);
            } else if (targetStage.assigneeType === 'subflow') {
                assigneeUserId = targetStage.assigneeUserId || submission.requesterUserId || 1;
            }
            if (!assigneeUserId) assigneeUserId = 1;
            assigneeMappings = [{ userId: assigneeUserId, formId: null }];
        }

        // 4. Create parallel tasks
        for (const mapping of assigneeMappings) {
            const nextState = stateRepo.create({
                submissionId: submission.id,
                stageId: targetStage.id,
                assignedUserId: mapping.userId,
                customFormIdToFill: mapping.formId,
                status: 'Pending'
            });
            await stateRepo.save(nextState);

            try {
                await notificationService.createNotification(
                    mapping.userId,
                    'Nueva Tarea de Flujo Asignada',
                    `Se te ha asignado la tarea: "${targetStage.name}" para la solicitud dinámica de ${submission.form.name}`,
                    'info'
                );
            } catch (err) {
                console.error('Error sending notification:', err);
            }
        }
    }

    async actionApproval(stateId: number, userId: number, action: 'approve' | 'reject', notes: string, formValues?: Record<string, string>, consecutive?: string) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        return await AppDataSource.transaction(async (manager) => {
            const stateRepo = manager.getRepository(DynamicSubmissionWorkflowState);
            const subRepo = manager.getRepository(DynamicFormSubmission);
            const userRepo = manager.getRepository(User);
            const stageRepo = manager.getRepository(DynamicWorkflowStage);
            const valRepo = manager.getRepository(DynamicFormFieldValue);

            // 1. Find active workflow state (allow Pending, or Approved if submission needs consecutive)
            let currentState = await stateRepo.findOne({
                where: { id: stateId, assignedUserId: userId, status: 'Pending' },
                relations: ['submission', 'stage', 'submission.form']
            });
            if (!currentState) {
                currentState = await stateRepo.findOne({
                    where: { id: stateId, assignedUserId: userId, status: 'Approved' },
                    relations: ['submission', 'stage', 'submission.form']
                });
                if (currentState && currentState.submission.status !== 'Pending Consecutive') {
                    currentState = null;
                }
            }
            if (!currentState) throw new Error('Tarea pendiente no encontrada o ya procesada');

            const submission = currentState.submission;
            const stage = currentState.stage;

            const isCorrection = (submission.status === 'Rejected' && currentState.assignedUserId === submission.requesterUserId);

            if (isCorrection) {
                // 1. Save / Update original form fields (which are parent forms)
                if (formValues) {
                    const parentSubs = await this.getAncestorSubmissions(submission.id);
                    if (parentSubs.length > 0) {
                        for (const pSub of parentSubs) {
                            const fields = await manager.getRepository(DynamicFormField).find({
                                where: { formId: pSub.formId }
                            });
                            for (const field of fields) {
                                const valStr = formValues[field.name];
                                if (valStr !== undefined && valStr !== null) {
                                    let valRecord = await valRepo.findOne({
                                        where: { submissionId: pSub.id, fieldId: field.id }
                                    });
                                    if (valRecord) {
                                        valRecord.value = String(valStr);
                                        await valRepo.save(valRecord);
                                    } else {
                                        valRecord = valRepo.create({
                                            submissionId: pSub.id,
                                            fieldId: field.id,
                                            value: String(valStr)
                                        });
                                        await valRepo.save(valRecord);
                                    }
                                }
                            }
                        }
                    } else {
                        // Regular submission correction
                        const fields = await manager.getRepository(DynamicFormField).find({
                            where: { formId: submission.formId }
                        });
                        for (const field of fields) {
                            const valStr = formValues[field.name];
                            if (valStr !== undefined && valStr !== null) {
                                let valRecord = await valRepo.findOne({
                                    where: { submissionId: submission.id, fieldId: field.id }
                                });
                                if (valRecord) {
                                    valRecord.value = String(valStr);
                                    await valRepo.save(valRecord);
                                } else {
                                    valRecord = valRepo.create({
                                        submissionId: submission.id,
                                        fieldId: field.id,
                                        value: String(valStr)
                                    });
                                    await valRepo.save(valRecord);
                                }
                            }
                        }
                    }
                }

                // 2. Mark correction task as Approved
                currentState.status = 'Approved';
                currentState.actionedByUserId = userId;
                currentState.notes = notes || 'Corrección enviada por el solicitante';
                await stateRepo.save(currentState);

                // 3. Reactivate submission workflow
                submission.status = 'In Progress';
                submission.currentStageId = stage.id;
                await subRepo.save(submission);

                // 4. Create parallel tasks for the same stage to review again
                await this.createStageStates(manager, submission, stage);

                return submission;
            }

            // 2. If approved and there are values to fill, save them
            const activatedConfigs: any[] = [];
            let multiFormsConfig: any[] = [];
            if (stage.assigneeUserIds) {
                try {
                    const parsed = JSON.parse(stage.assigneeUserIds);
                    multiFormsConfig = Array.isArray(parsed) ? parsed : (parsed.multiFormsConfig || []);
                } catch(e) {}
            }
            const isMultiFormsStage = multiFormsConfig.length > 0 && (multiFormsConfig[0].sourceFormId !== undefined || multiFormsConfig[0].targetFormIdToFill !== undefined || multiFormsConfig[0].targetSubflowFormId !== undefined);

            const previousApprovedInStage = await stateRepo.find({
                where: { submissionId: submission.id, stageId: stage.id, status: 'Approved' },
                order: { createdAt: 'ASC' }
            });
            const isInitialDispatch = isMultiFormsStage && previousApprovedInStage.length === 0;

            if (action === 'approve' && formValues) {
                if (isInitialDispatch) {
                    // Multi-form filling mode: parse multiFormsConfig
                    for (const cfg of multiFormsConfig) {
                        const sFormId = cfg.sourceFormId;
                        if (!sFormId) continue;
                        const fields = await manager.getRepository(DynamicFormField).find({
                            where: { formId: sFormId }
                        });
                        let hasFilled = false;
                        for (const field of fields) {
                            const valStr = formValues[`${sFormId}_${field.name}`] !== undefined 
                                ? formValues[`${sFormId}_${field.name}`] 
                                : formValues[field.name];
                            if (valStr !== undefined && valStr !== null && String(valStr).trim() !== '') {
                                hasFilled = true;
                                const fieldValue = valRepo.create({
                                    submissionId: submission.id,
                                    fieldId: field.id,
                                    value: String(valStr),
                                    workflowStateId: currentState.id
                                });
                                await valRepo.save(fieldValue);
                            }
                        }
                        if (hasFilled) {
                            activatedConfigs.push(cfg);
                        }
                    }
                } else {
                    const formIdToFill = currentState.customFormIdToFill || stage.formIdToFill;
                    if (formIdToFill && formIdToFill > 0) {
                        // Save standard single form values under this submission
                        const fields = await manager.getRepository(DynamicFormField).find({
                            where: { formId: formIdToFill }
                        });
                        for (const field of fields) {
                            const valueStr = formValues[field.name];
                            if (valueStr !== undefined && valueStr !== null) {
                                const fieldValue = valRepo.create({
                                    submissionId: submission.id,
                                    fieldId: field.id,
                                    value: String(valueStr),
                                    workflowStateId: currentState.id
                                });
                                await valRepo.save(fieldValue);
                            }
                        }
                    }
                }
            }

            if (action === 'approve') {
                // Mark current workflow state as Approved
                currentState.status = 'Approved';
                currentState.actionedByUserId = userId;
                currentState.notes = notes;
                await stateRepo.save(currentState);

                // Case A: Initial Dispatch in a Multi-forms Stage
                if (isInitialDispatch && activatedConfigs.length > 0) {
                    for (const cfg of activatedConfigs) {
                        const targetType = cfg.targetType || (cfg.targetSubflowFormId ? 'subflow' : (cfg.assignedTeamId ? 'team_random' : 'user'));

                        if (targetType === 'subflow' || cfg.targetSubflowFormId) {
                            const subflowFormId = cfg.targetSubflowFormId || cfg.sourceFormId;
                            if (subflowFormId) {
                                // Create Child Submission for the Subflow
                                const childSub = subRepo.create({
                                    formId: subflowFormId,
                                    requesterUserId: submission.requesterUserId,
                                    parentSubmissionId: submission.id,
                                    status: 'In Progress'
                                });
                                const savedChildSub = await subRepo.save(childSub);

                                // Find stages configured for this subflow
                                const childForm = await manager.getRepository(DynamicForm).findOne({ where: { id: subflowFormId } });
                                const childWfId = childForm?.workflowId;
                                const childStages = await stageRepo.find({
                                    where: [
                                        { workflowId: childWfId || -1, isDeleted: false },
                                        { formId: subflowFormId, isDeleted: false }
                                    ],
                                    order: { stepOrder: 'ASC' }
                                });

                                if (childStages.length > 0) {
                                    const firstChildStage = childStages[0];
                                    savedChildSub.currentStageId = firstChildStage.id;
                                    await subRepo.save(savedChildSub);
                                    await this.createStageStates(manager, savedChildSub, firstChildStage);
                                } else {
                                    // Direct single approval for child subflow
                                    let targetUserId = cfg.assignedUserId;
                                    if (!targetUserId && cfg.assignedTeamId) {
                                        targetUserId = await this.resolveTeamUser(manager, cfg.assignedTeamId, cfg.targetType === 'team_leader' ? 'leader' : 'random');
                                    }
                                    if (!targetUserId) targetUserId = 1;

                                    const childState = stateRepo.create({
                                        submissionId: savedChildSub.id,
                                        stageId: stage.id,
                                        assignedUserId: targetUserId,
                                        customFormIdToFill: cfg.targetFormIdToFill || null,
                                        status: 'Pending'
                                    });
                                    await stateRepo.save(childState);
                                    try {
                                        await notificationService.createNotification(
                                            targetUserId,
                                            'Nueva Tarea de Flujo Asignada',
                                            `Se te ha asignado una tarea para la solicitud de ${submission.form.name}`,
                                            'info'
                                        );
                                    } catch(e) {}
                                }
                            }
                        } else if (targetType === 'team_random' || targetType === 'team_leader' || cfg.assignedTeamId) {
                            const recipientUserId = await this.resolveTeamUser(manager, cfg.assignedTeamId!, targetType === 'team_leader' ? 'leader' : 'random');
                            const customFormIdToFill = cfg.targetFormIdToFill || null;
                            const recipientState = stateRepo.create({
                                submissionId: submission.id,
                                stageId: stage.id, // KEEP IN SAME STAGE
                                assignedUserId: recipientUserId,
                                customFormIdToFill: customFormIdToFill,
                                status: 'Pending'
                            });
                            await stateRepo.save(recipientState);

                            try {
                                await notificationService.createNotification(
                                    recipientUserId,
                                    'Nueva Tarea de Flujo Asignada',
                                    `Se te ha asignado una tarea en la etapa: "${stage.name}" para la solicitud de ${submission.form.name}`,
                                    'info'
                                );
                            } catch (err) {
                                console.error('Error sending notification:', err);
                            }
                        } else {
                            const recipientUserId = cfg.assignedUserId || 1;
                            const customFormIdToFill = cfg.targetFormIdToFill || null;
                            const recipientState = stateRepo.create({
                                submissionId: submission.id,
                                stageId: stage.id, // KEEP IN SAME STAGE
                                assignedUserId: recipientUserId,
                                customFormIdToFill: customFormIdToFill,
                                status: 'Pending'
                            });
                            await stateRepo.save(recipientState);

                            try {
                                await notificationService.createNotification(
                                    recipientUserId,
                                    'Nueva Tarea de Flujo Asignada',
                                    `Se te ha asignado una tarea en la etapa: "${stage.name}" para la solicitud de ${submission.form.name}`,
                                    'info'
                                );
                            } catch (err) {
                                console.error('Error sending notification:', err);
                            }
                        }
                    }
                    submission.currentStageId = stage.id;
                    submission.status = 'In Progress';
                    await subRepo.save(submission);
                    return submission;
                }

                // Case B: Check remaining pending approvals in the current stage
                const pendingCount = await stateRepo.count({
                    where: { submissionId: submission.id, stageId: stage.id, status: 'Pending' }
                });

                if (pendingCount > 0) {
                    // Still waiting for other tasks to finish
                    return submission;
                }

                // Check if there are active child sub-flows still running for this submission
                const pendingChildSubsCount = await subRepo.count({
                    where: { parentSubmissionId: submission.id, status: Not('Completed') }
                });
                if (pendingChildSubsCount > 0) {
                    // Still waiting for child sub-flows to finish
                    return submission;
                }

                // Case C: If this is a multi-form stage and recipients/subflows just finished, return to initial owner for consolidation!
                if (isMultiFormsStage && previousApprovedInStage.length > 0) {
                    const initialOwnerState = previousApprovedInStage[0];
                    const initialOwnerId = initialOwnerState.actionedByUserId || initialOwnerState.assignedUserId;

                    // Check if current state being approved was already the consolidation review by the owner on the parent submission
                    const isConsolidationApproval = (currentState.id !== initialOwnerState.id && currentState.assignedUserId === initialOwnerId && currentState.submissionId === submission.id);

                    if (!isConsolidationApproval) {
                        // Create consolidation review state for the stage owner
                        const consolidationState = stateRepo.create({
                            submissionId: submission.id,
                            stageId: stage.id,
                            assignedUserId: initialOwnerId,
                            customFormIdToFill: null, // Simple consolidation approval
                            status: 'Pending'
                        });
                        await stateRepo.save(consolidationState);

                        try {
                            await notificationService.createNotification(
                                initialOwnerId,
                                'Respuestas y Sub-Flujos Completados - Revisión Requerida',
                                `Todos los sub-flujos y destinatarios han respondido en la etapa "${stage.name}". Por favor revisa y aprueba para continuar el flujo.`,
                                'info'
                            );
                        } catch (err) {
                            console.error('Error sending notification:', err);
                        }
                        submission.currentStageId = stage.id;
                        submission.status = 'In Progress';
                        await subRepo.save(submission);
                        return submission;
                    }
                }

                // Case D: All tasks and consolidation finished -> Advance to next stage!
                let currentWfId = stage.workflowId;
                let currentStepOrder = stage.stepOrder;
                let advanced = false;

                while (currentWfId) {
                    // Check if there is another stage within the current workflow/subflow
                    const nextStageInCurrentWf = await stageRepo.createQueryBuilder("stage")
                        .where("stage.workflowId = :wfId", { wfId: currentWfId })
                        .andWhere("stage.stepOrder > :stepOrder", { stepOrder: currentStepOrder })
                        .andWhere("stage.isDeleted = :isDeleted", { isDeleted: false })
                        .orderBy("stage.stepOrder", "ASC")
                        .getOne();

                    if (nextStageInCurrentWf) {
                        // Found next stage in current workflow/subflow!
                        submission.currentStageId = nextStageInCurrentWf.id;
                        submission.status = 'In Progress';
                        await subRepo.save(submission);
                        await this.createStageStates(manager, submission, nextStageInCurrentWf);
                        advanced = true;
                        break;
                    }

                    // If current workflow is the root submission workflow and has no more stages, we are done!
                    const rootWfId = submission.workflowId || (submission.form ? submission.form.workflowId : null);
                    if (currentWfId === rootWfId || !rootWfId) {
                        break;
                    }

                    // Unwind to parent workflow that invoked currentWfId
                    const invokingStage = await stageRepo.findOne({
                        where: { assigneeType: 'subflow', formIdToFill: currentWfId, isDeleted: false }
                    });

                    if (invokingStage && invokingStage.workflowId) {
                        currentWfId = invokingStage.workflowId;
                        currentStepOrder = invokingStage.stepOrder;
                    } else {
                        // Fallback to root workflow
                        currentWfId = rootWfId;
                        currentStepOrder = submission.currentStage?.stepOrder || 0;
                    }
                }

                if (!advanced) {
                    if (submission.parentSubmissionId) {
                        // Mark child subflow submission as Completed
                        submission.currentStageId = null;
                        submission.status = 'Completed';
                        await subRepo.save(submission);

                        // Check if all sibling child submissions of this parent have completed
                        const pendingSiblingsCount = await subRepo.count({
                            where: { parentSubmissionId: submission.parentSubmissionId, status: Not('Completed') }
                        });

                        if (pendingSiblingsCount === 0) {
                            // Resume / advance the parent submission to its next stage!
                            const parentSub = await subRepo.findOne({
                                where: { id: submission.parentSubmissionId },
                                relations: ['form', 'currentStage']
                            });

                            if (parentSub && parentSub.currentStage) {
                                const parentWfId = parentSub.workflowId || (parentSub.form ? parentSub.form.workflowId : null);
                                
                                const parentNextStage = await stageRepo.createQueryBuilder("stage")
                                    .where("(stage.workflowId = :wfId OR (stage.workflowId IS NULL AND stage.formId = :formId))", { wfId: parentWfId, formId: parentSub.formId })
                                    .andWhere("stage.stepOrder > :stepOrder", { stepOrder: parentSub.currentStage.stepOrder })
                                    .andWhere("stage.isDeleted = :isDeleted", { isDeleted: false })
                                    .orderBy("stage.stepOrder", "ASC")
                                    .getOne();

                                if (parentNextStage) {
                                    parentSub.currentStageId = parentNextStage.id;
                                    parentSub.status = 'In Progress';
                                    await subRepo.save(parentSub);
                                    await this.createStageStates(manager, parentSub, parentNextStage);
                                } else {
                                    // Parent submission also completed all stages!
                                    const parentWf = parentWfId ? await manager.getRepository(DynamicWorkflow).findOne({ where: { id: parentWfId } }) : null;
                                    const requireConsec = parentWf ? (parentWf.requireConsecutive ?? true) : (parentSub.form ? (parentSub.form.requireConsecutive ?? true) : true);

                                    if (requireConsec && !consecutive) {
                                        parentSub.status = 'Pending Consecutive';
                                        await subRepo.save(parentSub);
                                    } else {
                                        parentSub.currentStageId = null;
                                        parentSub.status = 'Completed';
                                        if (consecutive) parentSub.consecutive = consecutive;
                                        await subRepo.save(parentSub);
                                    }
                                }
                            }
                        }
                    } else {
                        // Root workflow is completed!
                        const rootWfId = submission.workflowId || (submission.form ? submission.form.workflowId : null);
                        const rootWf = rootWfId ? await manager.getRepository(DynamicWorkflow).findOne({ where: { id: rootWfId } }) : null;
                        const requireConsec = rootWf ? (rootWf.requireConsecutive ?? true) : (submission.form ? (submission.form.requireConsecutive ?? true) : true);

                        if (requireConsec && !consecutive) {
                            submission.status = 'Pending Consecutive';
                            await subRepo.save(submission);
                        } else {
                            submission.currentStageId = null;
                            submission.status = 'Completed';
                            if (consecutive) submission.consecutive = consecutive;
                            await subRepo.save(submission);

                            try {
                                await notificationService.createNotification(
                                    submission.requesterUserId,
                                    'Solicitud Completada',
                                    `Tu solicitud de "${currentState.submission.form.name}" ha sido completada y aprobada${consecutive ? ' con consecutivo ' + consecutive : ''}.`,
                                    'success'
                                );
                            } catch (err) {}
                        }
                    }
                }
            } else if (action === 'reject') {
                currentState.status = 'Rejected';
                currentState.actionedByUserId = userId;
                currentState.notes = notes;
                await stateRepo.save(currentState);

                // Cancel all other pending states for this stage/submission!
                await stateRepo.update(
                    { submissionId: submission.id, stageId: stage.id, status: 'Pending' },
                    { status: 'Rejected', notes: 'Rechazado por otro aprobador' }
                );

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

