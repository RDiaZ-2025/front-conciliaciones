import { ProductionRequest, Product, User, FormatType, RightsDuration, Team, Subteam, SubteamUser, ProductionRequestType, DynamicWorkflow, DynamicForm, DynamicFormField, DynamicFormSubmission, DynamicFormFieldValue, DynamicWorkflowStage, DynamicSubmissionWorkflowState } from "../models";
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
import { productionAssignmentService } from './production_assignment.service';
import { dynamicFormService } from './dynamic_form.service';

const authService = new AuthService();
const workflowService = new WorkflowService();
const notificationService = new NotificationService();
const historyService = new ProductionRequestHistoryService();

const performSmartAssignment = (department: string) => productionAssignmentService.performSmartAssignment(department);

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
        return dynamicFormService.getRequestTypes();
    }

    async getInitialForm() {
        return dynamicFormService.getInitialForm();
    }

    private sanitizeFieldMetadata(meta: any): any {
        return dynamicFormService.sanitizeFieldMetadata(meta);
    }

    async getFormFields(formId: number, includeInactive: boolean = false) {
        return dynamicFormService.getFormFields(formId, includeInactive);
    }

    async createSubmission(
        formId: number,
        requesterUserId: number,
        values: Record<string, string>,
        targetFormIds?: number[],
        submissions?: { formId: number; values: Record<string, string> }[],
        targetTeamIds?: number[],
        targetTeams?: Array<{ teamId: number; subteamId?: number | null; assignmentMode?: 'leader' | 'random' | 'workflow' | 'subteam_random' }>,
        closingConfig?: { formId?: number | null; workflowId?: number | null }
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

                const rootEntry = submissions[0];
                let rootFormMeta: any = {};
                if (rootEntry.formId) {
                    const rootForm = await transactionManager.getRepository(DynamicForm).findOne({ where: { id: rootEntry.formId } });
                    if (rootForm?.metadata) {
                        try {
                            rootFormMeta = typeof rootForm.metadata === 'object' ? rootForm.metadata : JSON.parse(rootForm.metadata);
                        } catch(e) {}
                    }
                }

                let effectiveClosingConfig: any = closingConfig;
                if (!effectiveClosingConfig && rootFormMeta.closingConfig) {
                    effectiveClosingConfig = rootFormMeta.closingConfig;
                }

                const isClosingRequired = !!(effectiveClosingConfig && effectiveClosingConfig.requireClosingStep === true);
                const closingWfId = isClosingRequired ? (effectiveClosingConfig?.closingWorkflowId || effectiveClosingConfig?.workflowId || null) : null;
                const closingFormId = isClosingRequired ? (effectiveClosingConfig?.closingFormId || effectiveClosingConfig?.formId || null) : null;
                const hasClosing = isClosingRequired && (!!closingWfId || !!closingFormId);

                const rootSub = subRepo.create({
                    formId: rootEntry.formId,
                    workflowId: closingWfId,
                    requesterUserId,
                    status: hasClosing ? 'In Progress' : 'Completed'
                });
                const savedRootSub = await subRepo.save(rootSub);

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

                let teamsToDispatch: Array<{ teamId: number; subteamId?: number | null; assignmentMode: 'leader' | 'random' | 'workflow' | 'subteam_random' }> = [];
                if (targetTeams && targetTeams.length > 0) {
                    teamsToDispatch = targetTeams.map(t => {
                        const isSubteam = (t.assignmentMode === 'subteam_random' || t.assignmentMode === 'random') && !!t.subteamId;
                        return {
                            teamId: t.teamId,
                            subteamId: isSubteam ? t.subteamId : null,
                            assignmentMode: isSubteam ? 'subteam_random' : (t.assignmentMode || 'leader')
                        };
                    });
                } else if (targetTeamIds && targetTeamIds.length > 0) {
                    teamsToDispatch = targetTeamIds.map(id => ({
                        teamId: id,
                        subteamId: null,
                        assignmentMode: 'leader'
                    }));
                }

                if (teamsToDispatch.length > 0) {
                    let formWfId: number | null = null;
                    let rootFormMeta: any = {};
                    if (rootEntry.formId) {
                        const rootForm = await transactionManager.getRepository(DynamicForm).findOne({ where: { id: rootEntry.formId } });
                        formWfId = rootForm?.workflowId || null;
                        if (rootForm?.metadata) {
                            try {
                                rootFormMeta = typeof rootForm.metadata === 'object' ? rootForm.metadata : JSON.parse(rootForm.metadata);
                            } catch(e) {}
                        }
                    }

                    for (const teamTarget of teamsToDispatch) {
                        const team = await teamRepo.findOne({
                            where: { id: teamTarget.teamId },
                            relations: ['leader']
                        });
                        if (!team) continue;

                        let targetWfId = formWfId;
                        if (rootFormMeta.teamWorkflows && rootFormMeta.teamWorkflows[teamTarget.teamId]) {
                            targetWfId = rootFormMeta.teamWorkflows[teamTarget.teamId];
                        } else if (!targetWfId && team.defaultWorkflowId) {
                            targetWfId = team.defaultWorkflowId;
                        }

                        const childSub = subRepo.create({
                            formId: rootEntry.formId,
                            workflowId: targetWfId || null,
                            requesterUserId,
                            parentSubmissionId: savedRootSub.id,
                            status: 'Pending'
                        });
                        const savedChildSub = await subRepo.save(childSub);

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

                        if (targetWfId) {
                            const firstStage = await stageRepo.findOne({
                                where: { workflowId: targetWfId, stepOrder: 1, isDeleted: false },
                                order: { stepOrder: 'ASC' }
                            });

                            if (firstStage) {
                                savedChildSub.currentStageId = firstStage.id;
                                savedChildSub.status = 'In Progress';
                                await subRepo.save(savedChildSub);

                                const mode = teamTarget.assignmentMode || 'leader';

                                if (mode === 'workflow') {
                                    await this.createStageStates(transactionManager, savedChildSub, firstStage);
                                } else {
                                    let assignedUserId: number | null = null;

                                    if (mode === 'subteam_random' || (mode === 'random' && teamTarget.subteamId)) {
                                        const subteamUserRepo = transactionManager.getRepository(SubteamUser);
                                        const subteamUsers = await subteamUserRepo.find({
                                            where: { subteamId: teamTarget.subteamId || undefined },
                                            relations: ['user']
                                        });
                                        const activeMembers = subteamUsers
                                            .map(su => su.user)
                                            .filter((u): u is User => !!u && (u.status === 1 || u.status === undefined || u.status === null));
                                        const pool = activeMembers.length > 0 ? activeMembers : subteamUsers.map(su => su.user).filter(Boolean);

                                        if (pool.length > 0) {
                                            const randomIndex = Math.floor(Math.random() * pool.length);
                                            assignedUserId = pool[randomIndex].id;
                                        } else {
                                            const subteam = await transactionManager.getRepository(Subteam).findOne({
                                                where: { id: teamTarget.subteamId || undefined }
                                            });
                                            assignedUserId = subteam?.leaderId || team.leaderId || null;
                                        }
                                    } else if (mode === 'leader') {
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

                                        let notifTarget = `el equipo ${team.name}`;
                                        if (teamTarget.subteamId && (mode === 'subteam_random' || mode === 'random')) {
                                            const subteam = await transactionManager.getRepository(Subteam).findOne({
                                                where: { id: teamTarget.subteamId }
                                            });
                                            if (subteam) {
                                                notifTarget = `el subequipo ${subteam.name} (${team.name})`;
                                            }
                                        }

                                        try {
                                            await notificationService.createNotification(
                                                assignedUserId,
                                                'Nueva Solicitud Asignada a tu Equipo',
                                                `Se ha asignado la tarea "${firstStage.name}" para ${notifTarget}.`,
                                                'info'
                                            );
                                        } catch (err) {
                                            console.error('Error sending notification to assigned user:', err);
                                        }
                                    } else {
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

                const submission = subRepo.create({
                    formId,
                    requesterUserId,
                    status: 'Completed'
                });
                const savedSubmission = await subRepo.save(submission);

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

                            await this.createStageStates(transactionManager, savedChildSub, firstStage);
                        }
                    }
                }
                return savedSubmission;
            }

            const submission = subRepo.create({
                formId,
                requesterUserId,
                status: 'Pending'
            });
            const savedSubmission = await subRepo.save(submission);

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

            const firstStage = await stageRepo.findOne({
                where: { formId, stepOrder: 1, isDeleted: false }
            });

            if (firstStage) {
                savedSubmission.currentStageId = firstStage.id;
                savedSubmission.status = 'In Progress';
                await subRepo.save(savedSubmission);

                let assigneeUserId: number | null = null;
                if (firstStage.assigneeType === 'specific_user') {
                    assigneeUserId = firstStage.assigneeUserId;
                } else if (firstStage.assigneeType === 'requester') {
                    assigneeUserId = requesterUserId;
                } else if (firstStage.assigneeType === 'requester_boss') {
                    const requester = await userRepo.findOne({ where: { id: requesterUserId } });
                    assigneeUserId = requester?.bossId || firstStage.assigneeUserId || 1;
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
                } else if (firstStage.assigneeType === 'subteam_random' && firstStage.assigneeSubteamId) {
                    const subteamUserRepo = AppDataSource.manager.getRepository(SubteamUser);
                    const subteamUsers = await subteamUserRepo.find({
                        where: { subteamId: firstStage.assigneeSubteamId },
                        relations: ['user']
                    });
                    const activeUsers = subteamUsers
                        .map((su: any) => su.user)
                        .filter((u: any) => !!u && (u.status === 1 || u.status === undefined || u.status === null));
                    
                    let candidates = activeUsers;
                    if (firstStage.excludeTeamLeader) {
                        const subteam = await AppDataSource.manager.getRepository(Subteam).findOne({ where: { id: firstStage.assigneeSubteamId } });
                        const team = firstStage.assigneeTeamId ? await AppDataSource.manager.getRepository(Team).findOne({ where: { id: firstStage.assigneeTeamId } }) : null;
                        const leadersToExclude = new Set([subteam?.leaderId, team?.leaderId].filter(Boolean));
                        const nonLeaders = activeUsers.filter((u: any) => !leadersToExclude.has(u.id));
                        if (nonLeaders.length > 0) candidates = nonLeaders;
                    }

                    if (candidates.length > 0) {
                        const randomIndex = Math.floor(Math.random() * candidates.length);
                        assigneeUserId = candidates[randomIndex].id;
                    } else {
                        const subteam = await AppDataSource.manager.getRepository(Subteam).findOne({
                            where: { id: firstStage.assigneeSubteamId },
                            relations: ['leader']
                        });
                        if (subteam?.leader && (subteam.leader.status === 1 || subteam.leader.status === undefined)) {
                            assigneeUserId = subteam.leader.id;
                        } else if (firstStage.assigneeTeamId) {
                            assigneeUserId = await this.resolveTeamUser(AppDataSource.manager, firstStage.assigneeTeamId, 'random', !!firstStage.excludeTeamLeader, requesterUserId);
                        }
                    }
                } else if (firstStage.assigneeType === 'team' && firstStage.assigneeTeamId) {

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

                if (!assigneeUserId) assigneeUserId = 1;

                const state = stateRepo.create({
                    submissionId: savedSubmission.id,
                    stageId: firstStage.id,
                    assignedUserId: assigneeUserId,
                    status: 'Pending'
                });
                await stateRepo.save(state);

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

        const subMap = new Map<number, DynamicFormSubmission>();
        submissions.forEach(s => subMap.set(s.id, s));

        const mainSubmissions = submissions.filter(sub => {
            const isEntryContainer = sub.parentSubmissionId === null && !sub.workflowId;
            let isInternalSubflow = false;
            if (sub.parentSubmissionId) {
                const parent = subMap.get(sub.parentSubmissionId);
                if (parent && (parent.workflowId !== null || parent.currentStageId !== null)) {
                    isInternalSubflow = true;
                }
            }
            return !isEntryContainer && !isInternalSubflow;
        });

        const allActiveStates = allTreeIds.size > 0 ? await stateRepo.find({
            where: { submissionId: In(Array.from(allTreeIds)), status: 'Pending' },
            relations: ['assignedUser', 'stage', 'stage.workflow', 'submission', 'submission.form']
        }) : [];

        const getDescendantIds = (rootId: number): Set<number> => {
            const ids = new Set<number>([rootId]);
            let added = true;
            while (added) {
                added = false;
                for (const s of submissions) {
                    if (s.parentSubmissionId && ids.has(s.parentSubmissionId) && !ids.has(s.id)) {
                        ids.add(s.id);
                        added = true;
                    }
                }
            }
            return ids;
        };

        const results = mainSubmissions.map((sub) => {
            const treeSubIds = getDescendantIds(sub.id);
            const activeStatesForThisSub = allActiveStates.filter(s => treeSubIds.has(s.submissionId));

            let assigneeName = 'Sin Asignar';
            let assigneeEmail: string | undefined = undefined;
            let displayStageName = 'Sin Asignar';

            let users = activeStatesForThisSub.map(s => s.assignedUser).filter(Boolean);
            if (users.length > 0) {
                assigneeName = Array.from(new Set(users.map(u => u.name))).join(', ');
                assigneeEmail = Array.from(new Set(users.map(u => u.email))).join(', ');
            }

            if (activeStatesForThisSub.length > 0) {
                const stageNames = activeStatesForThisSub.map(st => {
                    if (st.stage) {
                        if (st.stage.workflow && sub.workflowId && st.stage.workflowId !== sub.workflowId) {
                            const parentStageName = sub.currentStage?.name || (st.submission?.form ? st.submission.form.name : 'Subflujo');
                            return `${parentStageName} (${st.stage.workflow.name}: ${st.stage.name})`;
                        } else if (st.submissionId !== sub.id && st.submission?.form) {
                            return `${st.submission.form.name}: ${st.stage.name}`;
                        }
                        return st.stage.name;
                    } else if (st.customFormIdToFill) {
                        return 'Cierre de la Solicitud';
                    }
                    return sub.currentStage ? sub.currentStage.name : (sub.status === 'Completed' ? 'Completado' : 'En Proceso');
                });
                displayStageName = Array.from(new Set(stageNames)).join(', ');
            } else {
                if (sub.status === 'Completed') {
                    displayStageName = 'Completado';
                } else if (sub.status === 'Rejected') {
                    displayStageName = 'Devuelta para Corrección';
                } else if (sub.currentStage) {
                    displayStageName = sub.currentStage.name;
                } else {
                    displayStageName = sub.status === 'In Progress' ? 'En Proceso' : sub.status;
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
        });

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
             const isChildSub = cState.submissionId !== sub.id;
             const resolvedForm = cState.customFormToFill || cState.stage?.formToFill || (isChildSub ? (cState as any).submission?.form : null);
             const resolvedFormId = cState.customFormIdToFill || cState.stage?.formIdToFill || (isChildSub ? (cState as any).submission?.formId : null);
             let stageVals = allValuesToInclude.filter(v => v && v.field && v.workflowStateId === cState.id);

             if (stageVals.length === 0 && isChildSub && resolvedFormId && (!cState.stage || cState.stage.stepOrder === 1) && cState.status === 'Approved' && !cState.notes?.toLowerCase().includes('rechaz')) {
                 stageVals = allValuesToInclude.filter(v => v && v.field && v.submissionId === cState.submissionId && !v.workflowStateId && v.field.formId === resolvedFormId);
             }

             const user = cState.actionedByUser || cState.assignedUser;

             let displayName = cState.stage ? cState.stage.name : 'Etapa';
             if (cState.notes && (cState.notes.toLowerCase().includes('corrección') || cState.notes.toLowerCase().includes('corregid') || cState.notes.toLowerCase().includes('corregir'))) {
                 displayName = `${displayName} (Corrección)`;
             }

             if (cState.stage?.workflow && sub.workflowId && cState.stage.workflowId !== sub.workflowId) {
                 displayName = `${cState.stage.workflow.name}: ${displayName}`;
             } else if (cState.submissionId !== sub.id && (cState as any).submission?.form) {
                 displayName = `${(cState as any).submission.form.name}: ${displayName}`;
             }

             let stateStatus = cState.status;

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
                 actionedByUserName: user?.name || 'Sin Asignar',
                 actionedByUserEmail: user?.email || '',
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

    async adminGetForms() {
        return dynamicFormService.adminGetForms();
    }

    async adminCreateForm(data: Partial<DynamicForm>) {
        return dynamicFormService.adminCreateForm(data);
    }

    async adminUpdateForm(id: number, data: Partial<DynamicForm>) {
        return dynamicFormService.adminUpdateForm(id, data);
    }

    async adminDeleteForm(id: number, physicalDelete: boolean = false) {
        return dynamicFormService.adminDeleteForm(id, physicalDelete);
    }

    async adminSaveFields(formId: number, fields: Partial<DynamicFormField>[]) {
        return dynamicFormService.adminSaveFields(formId, fields);
}

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
                { workflowId, isDeleted: false }
            ],
            relations: ['assigneeUser', 'assigneeTeam', 'assigneeSubteam', 'formToFill', 'rejectionTargetUser', 'rejectionTargetTeam'],
            order: { stepOrder: 'ASC' }
        });
        return stages.map(s => {
            let parsedIds: any = [];
            if (s.assigneeUserIds) {
                try {
                    parsedIds = JSON.parse(s.assigneeUserIds);
                } catch(e) {}
            }
            let parsedNextAssigneeOptions: any = [];
            if (s.nextStageAssigneeOptions) {
                try {
                    parsedNextAssigneeOptions = typeof s.nextStageAssigneeOptions === 'string' ? JSON.parse(s.nextStageAssigneeOptions) : s.nextStageAssigneeOptions;
                } catch(e) {}
            }
            const isMultiForms = (parsedIds && !Array.isArray(parsedIds) && parsedIds.multiFormsConfig && parsedIds.multiFormsConfig.length > 0)
                || (Array.isArray(parsedIds) && parsedIds.length > 0 && (parsedIds[0].sourceFormId !== undefined || parsedIds[0].targetFormIdToFill !== undefined || parsedIds[0].targetSubflowFormId !== undefined || parsedIds[0].targetSubflowWorkflowId !== undefined));
            return {
                ...s,
                formIdToFill: isMultiForms ? -1 : s.formIdToFill,
                assigneeUserIds: parsedIds,
                allowChooseNextStageAssignee: !!s.allowChooseNextStageAssignee,
                nextStageAssigneeOptions: parsedNextAssigneeOptions
            };
        });
    }

    async adminSaveWorkflowStages(workflowId: number, stages: Partial<DynamicWorkflowStage>[]) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        return await AppDataSource.transaction(async (manager) => {
            const stageRepo = manager.getRepository(DynamicWorkflowStage);

            const existingStages = await stageRepo.find({
                where: { workflowId }
            });
            const inputIds = stages.map(s => s.id).filter(id => !!id) as number[];

            const stagesToDelete = existingStages.filter(es => !inputIds.includes(es.id));
            if (stagesToDelete.length > 0) {
                for (const es of stagesToDelete) {
                    es.isDeleted = true;
                    await stageRepo.save(es);
                }
            }

            const savedStages = [];
            for (let i = 0; i < stages.length; i++) {
                const s = stages[i];
                let stageEntity = existingStages.find(es => es.id === s.id);
                const dbFormIdToFill = (s.formIdToFill && s.formIdToFill > 0) ? s.formIdToFill : null;

                if (!stageEntity) {
                    stageEntity = stageRepo.create({
                        workflowId,
                        formId: null,
                        isDeleted: false,
                        name: s.name || `Etapa ${i + 1}`,
                        description: s.description,
                        stepOrder: s.stepOrder ?? (i + 1),
                        assigneeType: s.assigneeType || 'specific_user',
                        assigneeUserId: s.assigneeUserId || null,
                        assigneeTeamId: s.assigneeTeamId || null,
                        assigneeSubteamId: s.assigneeSubteamId || null,
                        formIdToFill: dbFormIdToFill,
                        rejectionTargetType: s.rejectionTargetType || 'previous_sender',
                        rejectionTargetUserId: s.rejectionTargetUserId || null,
                        rejectionTargetTeamId: s.rejectionTargetTeamId || null,
                        requireCommentOnApprove: !!s.requireCommentOnApprove,
                        excludeTeamLeader: !!s.excludeTeamLeader,
                        assigneeUserIds: s.assigneeUserIds ? JSON.stringify(s.assigneeUserIds) : null,
                        allowChooseNextStageAssignee: !!s.allowChooseNextStageAssignee,
                        nextStageAssigneeOptions: s.nextStageAssigneeOptions ? (typeof s.nextStageAssigneeOptions === 'string' ? s.nextStageAssigneeOptions : JSON.stringify(s.nextStageAssigneeOptions)) : null
                    });
                } else {
                    stageEntity.isDeleted = false;
                    stageEntity.workflowId = workflowId;
                    stageEntity.formId = null;
                    if (s.name !== undefined) stageEntity.name = s.name;
                    if (s.description !== undefined) stageEntity.description = s.description;
                    if (s.stepOrder !== undefined) stageEntity.stepOrder = s.stepOrder;
                    if (s.assigneeType !== undefined) stageEntity.assigneeType = s.assigneeType;
                    if (s.assigneeUserId !== undefined) stageEntity.assigneeUserId = s.assigneeUserId;
                    if (s.assigneeTeamId !== undefined) stageEntity.assigneeTeamId = s.assigneeTeamId;
                    if (s.assigneeSubteamId !== undefined) stageEntity.assigneeSubteamId = s.assigneeSubteamId;
                    if (s.formIdToFill !== undefined) stageEntity.formIdToFill = dbFormIdToFill;
                    if (s.rejectionTargetType !== undefined) stageEntity.rejectionTargetType = s.rejectionTargetType;
                    if (s.rejectionTargetUserId !== undefined) stageEntity.rejectionTargetUserId = s.rejectionTargetUserId;
                    if (s.rejectionTargetTeamId !== undefined) stageEntity.rejectionTargetTeamId = s.rejectionTargetTeamId;
                    if (s.requireCommentOnApprove !== undefined) stageEntity.requireCommentOnApprove = s.requireCommentOnApprove;
                    if (s.excludeTeamLeader !== undefined) stageEntity.excludeTeamLeader = !!s.excludeTeamLeader;
                    if (s.assigneeUserIds !== undefined) stageEntity.assigneeUserIds = s.assigneeUserIds ? JSON.stringify(s.assigneeUserIds) : null;
                    if (s.allowChooseNextStageAssignee !== undefined) stageEntity.allowChooseNextStageAssignee = !!s.allowChooseNextStageAssignee;
                    if (s.nextStageAssigneeOptions !== undefined) {
                        stageEntity.nextStageAssigneeOptions = s.nextStageAssigneeOptions ? (typeof s.nextStageAssigneeOptions === 'string' ? s.nextStageAssigneeOptions : JSON.stringify(s.nextStageAssigneeOptions)) : null;
                    }
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

    async getPendingApprovals(userId: number) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        const stateRepo = AppDataSource.getRepository(DynamicSubmissionWorkflowState);

        let states = await stateRepo.find({
            where: { assignedUserId: userId, status: 'Pending' },
            relations: ['submission', 'submission.form', 'stage', 'stage.formToFill', 'customFormToFill', 'submission.requesterUser'],
            order: { createdAt: 'DESC' }
        });

        states = states.filter(s => s.submission && (s.submission.status === 'In Progress' || s.submission.status === 'Rejected'));

        const allTeams = await AppDataSource.getRepository(Team).find({ relations: ['subteams'] });
        const allUsers = await AppDataSource.getRepository(User).find({ select: ['id', 'name', 'email'] });

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

            const wfId = state.submission.workflowId || state.stage?.workflowId || (state.submission.form ? state.submission.form.workflowId : null);
            const wf = state.submission.workflow || (wfId ? await AppDataSource.getRepository(DynamicWorkflow).findOne({ where: { id: wfId } }) : null);
            let nextStageQuery = AppDataSource.getRepository(DynamicWorkflowStage)
                .createQueryBuilder("stage")
                .where("stage.stepOrder > :stepOrder", { stepOrder: state.stage ? state.stage.stepOrder : 0 })
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

            const submittedValuesRaw: Record<string, string> = {};
            for (const v of allValuesToInclude) {
                if (v && v.field) {
                    submittedValuesRaw[v.field.name] = v.value || '';
                    submittedValuesRaw[`${v.field.formId}_${v.field.name}`] = v.value || '';
                }
            }

            const isCorrection = (state.submission.status === 'Rejected');
            const hasPriorApprovedStages = allStatesToInclude.some(cs => cs.status === 'Approved');
            const isInitialRequestCorrection = isCorrection &&
                (state.assignedUserId === state.submission.requesterUserId) &&
                !state.customFormIdToFill &&
                !hasPriorApprovedStages &&
                !state.submission.parentSubmissionId;
            const statesForHistory = allStatesToInclude.filter(cs => cs.id < state.id && cs.status !== 'Pending');

            const historyStages = statesForHistory.map((cState) => {
                const resolvedForm = cState.customFormToFill || cState.stage?.formToFill;
                const resolvedFormId = cState.customFormIdToFill || cState.stage?.formIdToFill;

                const stageVals = allValuesToInclude.filter(v => v && v.field && v.workflowStateId === cState.id);

                const user = cState.actionedByUser || cState.assignedUser;

                let displayName = cState.stage ? cState.stage.name : 'Etapa';
                if (cState.notes && (cState.notes.toLowerCase().includes('corrección') || cState.notes.toLowerCase().includes('corregid'))) {
                    displayName = `${displayName} (Corrección)`;
                }

                if (cState.stage?.workflow && state.submission.workflowId && cState.stage.workflowId !== state.submission.workflowId) {
                    displayName = `${cState.stage.workflow.name}: ${displayName}`;
                } else if (cState.submissionId !== state.submissionId && (cState as any).submission?.form) {
                    displayName = `${(cState as any).submission.form.name}: ${displayName}`;
                }

                let stateStatus = cState.status;

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
                    actionedByUserName: user?.name || 'Sin Asignar',
                    actionedByUserEmail: user?.email || '',
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

            const parentForms = [];
            if (isInitialRequestCorrection) {
                const seenFormIds = new Set<number>();
                const submissionsToCorrect = (parentSubmissions && parentSubmissions.length > 0)
                    ? parentSubmissions
                    : [state.submission];
                const fieldRepo = AppDataSource.getRepository(DynamicFormField);
                for (const pSub of submissionsToCorrect) {
                    if (seenFormIds.has(pSub.formId)) continue;
                    seenFormIds.add(pSub.formId);

                    const fields = await fieldRepo.find({
                        where: { formId: pSub.formId, isActive: true },
                        order: { displayOrder: 'ASC' }
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
                            isActive: f.isActive,
                            defaultValueExpression: f.defaultValueExpression,
                            formulaExpression: f.formulaExpression,
                            visibilityCondition: f.visibilityCondition,
                            value: valObj ? valObj.value : ''
                        };
                    });

                    parentForms.push({
                        formId: pSub.formId,
                        formName: pSub.form ? pSub.form.name : 'Formulario',
                        fields: mappedFields
                    });
                }
            }

            let parsedAssigneeConfig: any = null;
            let isMultiForms = false;
            let cfgList: any[] = [];
            if (state.stage?.assigneeUserIds) {
                try {
                    parsedAssigneeConfig = JSON.parse(state.stage.assigneeUserIds);
                    cfgList = Array.isArray(parsedAssigneeConfig) ? parsedAssigneeConfig : (parsedAssigneeConfig.multiFormsConfig || []);
                    if (cfgList.length > 0 && (cfgList[0].sourceFormId !== undefined || cfgList[0].targetFormIdToFill !== undefined)) {
                        const stageApprovedStates = allStatesToInclude.filter((cs: any) => cs.stageId === state.stage?.id && cs.status === 'Approved');
                        if (stageApprovedStates.length === 0) {
                            isMultiForms = true;
                        }
                    }
                } catch(e) {}
            }

            const maxSelectedForms = (parsedAssigneeConfig && parsedAssigneeConfig.maxSelectedForms !== undefined) ? parsedAssigneeConfig.maxSelectedForms : null;
            const formIdToFill = isInitialRequestCorrection ? null : (isMultiForms ? -1 : (state.customFormIdToFill || state.stage?.formIdToFill || (isCorrection ? state.submission.formId : null)));
            let formToFill = isInitialRequestCorrection ? null : (state.customFormToFill || state.stage?.formToFill || (isCorrection ? state.submission.form : null));

            if (formIdToFill && formIdToFill > 0 && (!formToFill || !formToFill.fields || formToFill.fields.length === 0)) {
                formToFill = await AppDataSource.getRepository(DynamicForm).findOne({
                    where: { id: formIdToFill },
                    relations: ['fields']
                });
            }

            const stageName = state.stage ? state.stage.name : (state.customFormToFill ? state.customFormToFill.name : 'Corrección');
            const stageDescription = state.stage ? state.stage.description : '';

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
                                fields: (frm.fields || []).filter((f: any) => f.isActive !== false).sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0)).map((f: any) => {
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
                parentSubmissionId: state.submission.parentSubmissionId,
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
                maxSelectedForms,
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
                requireCommentOnApprove: state.stage ? !!state.stage.requireCommentOnApprove : false,
                allowChooseNextStageAssignee: state.stage ? !!state.stage.allowChooseNextStageAssignee : false,
                nextStageAssigneeOptions: (() => {
                    if (!state.stage?.allowChooseNextStageAssignee || !state.stage?.nextStageAssigneeOptions) return [];
                    try {
                        const raw = typeof state.stage.nextStageAssigneeOptions === 'string'
                            ? JSON.parse(state.stage.nextStageAssigneeOptions)
                            : state.stage.nextStageAssigneeOptions;
                        if (!Array.isArray(raw)) return [];
                        return raw.map((opt: any) => {
                            let defaultLabel = '';
                            if (opt.type === 'specific_user') {
                                const u = allUsers.find(u => u.id === opt.userId);
                                defaultLabel = u ? `👤 ${u.name}` : `👤 Usuario #${opt.userId}`;
                            } else if (opt.type === 'team_random') {
                                const t = allTeams.find(t => t.id === opt.teamId);
                                defaultLabel = t ? `🎲 Al azar de: ${t.name}` : `🎲 Equipo #${opt.teamId}`;
                            } else if (opt.type === 'team_leader') {
                                const t = allTeams.find(t => t.id === opt.teamId);
                                defaultLabel = t ? `👔 Líder de: ${t.name}` : `👔 Líder de equipo #${opt.teamId}`;
                            } else if (opt.type === 'team_workload') {
                                const t = allTeams.find(t => t.id === opt.teamId);
                                defaultLabel = t ? `⚖️ Menor carga de: ${t.name}` : `⚖️ Equipo #${opt.teamId}`;
                            } else if (opt.type === 'subteam_random') {
                                let subName = `Subequipo #${opt.subteamId}`;
                                for (const t of allTeams) {
                                    const st = (t.subteams || []).find((s: any) => s.id === opt.subteamId);
                                    if (st) {
                                        subName = `${st.name} (${t.name})`;
                                        break;
                                    }
                                }
                                defaultLabel = `👥 Al azar de subequipo: ${subName}`;
                            } else if (opt.type === 'requester') {
                                defaultLabel = '👤 Solicitante Original';
                            } else if (opt.type === 'requester_boss') {
                                defaultLabel = '👔 Jefe del Solicitante';
                            }
                            return {
                                ...opt,
                                displayLabel: opt.label && opt.label.trim() ? opt.label.trim() : (defaultLabel || 'Opción de asignación')
                            };
                        });
                    } catch (e) {
                        return [];
                    }
                })(),
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
        return productionAssignmentService.resolveTeamUser(manager, teamId, strategy, excludeLeader, previousActionerId);
    }

    async resolveChosenAssignee(manager: any, submission: any, currentStage: any, nextStage: any, chosenOption: any): Promise<number | undefined> {
        if (!chosenOption) return undefined;

        let opt = chosenOption;
        if (typeof opt === 'string') {
            try {
                opt = JSON.parse(opt);
            } catch (e) {
                const num = Number(opt);
                if (!isNaN(num) && num > 0) return num;
                return undefined;
            }
        }

        // If currentStage has configured nextStageAssigneeOptions, enforce that the option matches the DB configuration
        if (currentStage?.nextStageAssigneeOptions) {
            try {
                const parsedOptions = typeof currentStage.nextStageAssigneeOptions === 'string'
                    ? JSON.parse(currentStage.nextStageAssigneeOptions)
                    : currentStage.nextStageAssigneeOptions;
                if (Array.isArray(parsedOptions) && parsedOptions.length > 0) {
                    const optionId = typeof opt === 'object' && opt !== null ? opt.id : opt;
                    const matched = parsedOptions.find((o: any) => o.id === optionId || (opt && o.id === opt.id));
                    if (matched) {
                        opt = matched; // Strictly use the trusted database record
                    } else if (currentStage?.allowChooseNextStageAssignee) {
                        throw new Error('La opción de destinatario seleccionada no es válida o no está configurada para esta etapa.');
                    }
                }
            } catch (e: any) {
                if (e.message && e.message.includes('La opción de destinatario')) throw e;
            }
        }

        const userRepo = manager.getRepository(User);

        if (opt.type === 'specific_user' && opt.userId) {
            return Number(opt.userId);
        }

        if (opt.type === 'requester') {
            return submission.requesterUserId;
        }

        if (opt.type === 'requester_boss') {
            const requester = await userRepo.findOne({ where: { id: submission.requesterUserId } });
            return requester?.bossId || submission.requesterUserId;
        }

        if (opt.type === 'previous_stage_actioner') {
            const stateRepo = manager.getRepository(DynamicSubmissionWorkflowState);
            const prevApproved = await stateRepo.findOne({
                where: { submissionId: submission.id, status: 'Approved' },
                order: { updatedAt: 'DESC' }
            });
            return prevApproved?.actionedByUserId || prevApproved?.assignedUserId || submission.requesterUserId;
        }

        if (opt.type === 'team_leader' && opt.teamId) {
            return await this.resolveTeamUser(manager, Number(opt.teamId), 'leader');
        }

        if (opt.type === 'team_workload' && opt.teamId) {
            return await this.resolveTeamUser(manager, Number(opt.teamId), 'workload', !!nextStage.excludeTeamLeader);
        }

        if (opt.type === 'team_random' && opt.teamId) {
            return await this.resolveTeamUser(manager, Number(opt.teamId), 'random', !!nextStage.excludeTeamLeader);
        }

        if (opt.type === 'subteam_random' && opt.subteamId) {
            const subteamUserRepo = manager.getRepository(SubteamUser);
            const subteamUsers = await subteamUserRepo.find({
                where: { subteamId: Number(opt.subteamId) },
                relations: ['user']
            });
            const activeUsers = subteamUsers
                .map((su: any) => su.user)
                .filter((u: any) => !!u && (u.status === 1 || u.status === undefined || u.status === null));

            let candidates = activeUsers;
            if (nextStage.excludeTeamLeader) {
                const subteam = await manager.getRepository(Subteam).findOne({ where: { id: Number(opt.subteamId) } });
                const team = opt.teamId ? await manager.getRepository(Team).findOne({ where: { id: Number(opt.teamId) } }) : null;
                const leadersToExclude = new Set([subteam?.leaderId, team?.leaderId].filter(Boolean));
                const nonLeaders = activeUsers.filter((u: any) => !leadersToExclude.has(u.id));
                if (nonLeaders.length > 0) candidates = nonLeaders;
            }

            if (candidates.length > 0) {
                const randomIndex = Math.floor(Math.random() * candidates.length);
                return candidates[randomIndex].id;
            } else {
                const subteam = await manager.getRepository(Subteam).findOne({
                    where: { id: Number(opt.subteamId) },
                    relations: ['leader']
                });
                if (subteam?.leader && (subteam.leader.status === 1 || subteam.leader.status === undefined)) {
                    return subteam.leader.id;
                } else if (opt.teamId) {
                    return await this.resolveTeamUser(manager, Number(opt.teamId), 'random', !!nextStage.excludeTeamLeader);
                }
            }
        }

        if (opt.userId) {
            return Number(opt.userId);
        }

        return undefined;
    }

    async createStageStates(manager: any, submission: any, targetStage: any, preferredAssigneeUserId?: number) {
        const stateRepo = manager.getRepository(DynamicSubmissionWorkflowState);
        const userRepo = manager.getRepository(User);
        const valRepo = manager.getRepository(DynamicFormFieldValue);

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

                await this.createStageStates(manager, submission, firstSubflowStage, preferredAssigneeUserId);
                return;
            }
        }

        const pastStates = await stateRepo.find({
            where: { submissionId: submission.id, stageId: targetStage.id }
        });
        const pastStateIds = pastStates.map((s: any) => s.id);
        if (pastStateIds.length > 0) {
            await valRepo.delete({ submissionId: submission.id, workflowStateId: In(pastStateIds) });
        }

        let assigneeMappings: { userId: number, formId: number | null }[] = [];

        if (preferredAssigneeUserId) {

            assigneeMappings = [{ userId: preferredAssigneeUserId, formId: targetStage.formIdToFill || null }];
        } else if (targetStage.assigneeType === 'multiple_users') {
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
            } else if (targetStage.assigneeType === 'subteam_random' && targetStage.assigneeSubteamId) {
                const subteamUserRepo = manager.getRepository(SubteamUser);
                const subteamUsers = await subteamUserRepo.find({
                    where: { subteamId: targetStage.assigneeSubteamId },
                    relations: ['user']
                });
                const activeUsers = subteamUsers
                    .map((su: any) => su.user)
                    .filter((u: any) => !!u && (u.status === 1 || u.status === undefined || u.status === null));
                
                let candidates = activeUsers;
                if (targetStage.excludeTeamLeader) {
                    const subteam = await manager.getRepository(Subteam).findOne({ where: { id: targetStage.assigneeSubteamId } });
                    const team = targetStage.assigneeTeamId ? await manager.getRepository(Team).findOne({ where: { id: targetStage.assigneeTeamId } }) : null;
                    const leadersToExclude = new Set([subteam?.leaderId, team?.leaderId].filter(Boolean));
                    const nonLeaders = activeUsers.filter((u: any) => !leadersToExclude.has(u.id));
                    if (nonLeaders.length > 0) candidates = nonLeaders;
                }

                if (candidates.length > 0) {
                    const randomIndex = Math.floor(Math.random() * candidates.length);
                    assigneeUserId = candidates[randomIndex].id;
                } else {
                    const subteam = await manager.getRepository(Subteam).findOne({
                        where: { id: targetStage.assigneeSubteamId },
                        relations: ['leader']
                    });
                    if (subteam?.leader && (subteam.leader.status === 1 || subteam.leader.status === undefined)) {
                        assigneeUserId = subteam.leader.id;
                    } else if (targetStage.assigneeTeamId) {
                        assigneeUserId = await this.resolveTeamUser(manager, targetStage.assigneeTeamId, 'random', !!targetStage.excludeTeamLeader);
                    }
                }
            } else if (targetStage.assigneeType === 'team_random' && targetStage.assigneeTeamId) {
                assigneeUserId = await this.resolveTeamUser(manager, targetStage.assigneeTeamId, 'random', !!targetStage.excludeTeamLeader);
            } else if (targetStage.assigneeType === 'team_workload' && targetStage.assigneeTeamId) {
                assigneeUserId = await this.resolveTeamUser(manager, targetStage.assigneeTeamId, 'workload', !!targetStage.excludeTeamLeader);
            } else if (targetStage.assigneeType === 'subflow' || targetStage.assigneeType === 'chosen_by_previous_stage') {
                assigneeUserId = targetStage.assigneeUserId || submission.requesterUserId || 1;
            }
            if (!assigneeUserId) assigneeUserId = 1;
            assigneeMappings = [{ userId: assigneeUserId, formId: null }];
        }

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

    private async handleSubmissionCompletion(manager: any, submission: DynamicFormSubmission): Promise<void> {
        const subRepo = manager.getRepository(DynamicFormSubmission);
        const stageRepo = manager.getRepository(DynamicWorkflowStage);
        const stateRepo = manager.getRepository(DynamicSubmissionWorkflowState);

        submission.currentStageId = null;
        submission.status = 'Completed';
        await subRepo.save(submission);

        if (!submission.parentSubmissionId) {

            let formEntity = submission.form;
            if (!formEntity && submission.formId) {
                formEntity = await manager.getRepository(DynamicForm).findOne({ where: { id: submission.formId } });
            }

            let rootMeta: any = {};
            if (formEntity?.metadata) {
                try {
                    rootMeta = typeof formEntity.metadata === 'object' ? formEntity.metadata : JSON.parse(formEntity.metadata);
                } catch(e) {}
            }
            const isClosingRequired = !!(rootMeta?.closingConfig && rootMeta.closingConfig.requireClosingStep === true);
            const closingWfId = isClosingRequired ? (rootMeta?.closingConfig?.closingWorkflowId || rootMeta?.closingConfig?.workflowId || null) : null;
            const closingFormId = isClosingRequired ? (rootMeta?.closingConfig?.closingFormId || rootMeta?.closingConfig?.formId || null) : null;

            if (isClosingRequired && closingWfId) {
                const firstClosingStage = await stageRepo.findOne({
                    where: { workflowId: closingWfId, stepOrder: 1, isDeleted: false },
                    order: { stepOrder: 'ASC' }
                });
                if (firstClosingStage) {
                    submission.workflowId = closingWfId;
                    submission.currentStageId = firstClosingStage.id;
                    submission.status = 'In Progress';
                    await subRepo.save(submission);
                    await this.createStageStates(manager, submission, firstClosingStage);
                    return;
                }
            } else if (isClosingRequired && closingFormId) {
                submission.workflowId = null;
                submission.currentStageId = null;
                submission.status = 'In Progress';
                await subRepo.save(submission);

                const closingState = stateRepo.create({
                    submissionId: submission.id,
                    stageId: null as any,
                    assignedUserId: submission.requesterUserId,
                    customFormIdToFill: closingFormId,
                    status: 'Pending'
                });
                await stateRepo.save(closingState);
                try {
                    await notificationService.createNotification(
                        submission.requesterUserId,
                        'Cierre de Solicitud Requerido',
                        `Todas las áreas han finalizado. Por favor diligencia el formulario de cierre para "${formEntity?.name || 'Solicitud'}".`,
                        'info'
                    );
                } catch (err) {}
                return;
            }

            submission.workflowId = null;
            submission.currentStageId = null;
            submission.status = 'Completed';
            await subRepo.save(submission);

            try {
                await notificationService.createNotification(
                    submission.requesterUserId,
                    'Solicitud Completada',
                    `Tu solicitud de "${formEntity?.name || 'Producción'}" ha sido completada y aprobada.`,
                    'success'
                );
            } catch (err) {}
            return;
        }

        const pendingSiblingsCount = await subRepo.count({
            where: { parentSubmissionId: submission.parentSubmissionId, status: Not('Completed') }
        });

        if (pendingSiblingsCount > 0) {

            return;
        }

        const parentSub = await subRepo.findOne({
            where: { id: submission.parentSubmissionId },
            relations: ['form', 'currentStage']
        });

        if (!parentSub) return;

        const parentWfId = parentSub.workflowId || (parentSub.form ? parentSub.form.workflowId : null);
        let parentNextStage = null;

        if (parentWfId && parentSub.currentStage) {
            parentNextStage = await stageRepo.createQueryBuilder("stage")
                .where("(stage.workflowId = :wfId OR (stage.workflowId IS NULL AND stage.formId = :formId))", { wfId: parentWfId, formId: parentSub.formId })
                .andWhere("stage.stepOrder > :stepOrder", { stepOrder: parentSub.currentStage.stepOrder })
                .andWhere("stage.isDeleted = :isDeleted", { isDeleted: false })
                .orderBy("stage.stepOrder", "ASC")
                .getOne();
        }

        if (parentNextStage) {

            parentSub.currentStageId = parentNextStage.id;
            parentSub.status = 'In Progress';
            await subRepo.save(parentSub);
            await this.createStageStates(manager, parentSub, parentNextStage);
        } else {

            await this.handleSubmissionCompletion(manager, parentSub);
        }
    }

    async actionApproval(stateId: number, userId: number, action: 'approve' | 'reject', notes: string, formValues?: Record<string, string>, consecutive?: string, chosenNextAssignee?: any) {
        if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
        return await AppDataSource.transaction(async (manager) => {
            const stateRepo = manager.getRepository(DynamicSubmissionWorkflowState);
            const subRepo = manager.getRepository(DynamicFormSubmission);
            const userRepo = manager.getRepository(User);
            const stageRepo = manager.getRepository(DynamicWorkflowStage);
            const valRepo = manager.getRepository(DynamicFormFieldValue);

            const currentState = await stateRepo.findOne({
                where: { id: stateId, assignedUserId: userId, status: 'Pending' },
                relations: ['submission', 'stage', 'submission.form']
            });
            if (!currentState) throw new Error('Tarea pendiente no encontrada o ya procesada');

            const submission = currentState.submission;
            const stage = currentState.stage;

            const isCorrection = (submission.status === 'Rejected');

            if (isCorrection) {

                if (formValues) {
                    const targetFormIds = new Set<number>();
                    if (currentState.customFormIdToFill) targetFormIds.add(currentState.customFormIdToFill);
                    if (stage?.formIdToFill) targetFormIds.add(stage.formIdToFill);
                    targetFormIds.add(submission.formId);
                    const parentSubs = await this.getAncestorSubmissions(submission.id);
                    parentSubs.forEach(p => targetFormIds.add(p.formId));

                    const valsToSave: DynamicFormFieldValue[] = [];
                    for (const fId of Array.from(targetFormIds)) {
                        const fields = await manager.getRepository(DynamicFormField).find({
                            where: { formId: fId }
                        });
                        for (const field of fields) {
                            const valStr = formValues[fId + '_' + field.name] !== undefined
                                ? formValues[fId + '_' + field.name]
                                : formValues[field.name];
                            if (valStr !== undefined && valStr !== null) {
                                valsToSave.push(valRepo.create({
                                    submissionId: submission.id,
                                    fieldId: field.id,
                                    workflowStateId: currentState.id,
                                    value: String(valStr)
                                }));
                            }
                        }
                    }
                    if (valsToSave.length > 0) {
                        await valRepo.save(valsToSave);
                    }
                }

                currentState.status = 'Approved';
                currentState.actionedByUserId = userId;
                currentState.notes = notes || 'Corrección enviada';
                await stateRepo.save(currentState);

                const lastRejectionState = await stateRepo.findOne({
                    where: { submissionId: submission.id, status: 'Rejected' },
                    order: { id: 'DESC' },
                    relations: ['stage']
                });
                const previousRejectingUserId = lastRejectionState?.actionedByUserId || undefined;
                const stageToReactivate = (lastRejectionState?.stage && lastRejectionState.stage.id !== stage.id)
                    ? lastRejectionState.stage
                    : stage;

                submission.status = 'In Progress';
                submission.currentStageId = stageToReactivate.id;
                await subRepo.save(submission);

                await this.createStageStates(manager, submission, stageToReactivate, previousRejectingUserId);

                return submission;
            }

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

                currentState.status = 'Approved';
                currentState.actionedByUserId = userId;
                currentState.notes = notes;
                await stateRepo.save(currentState);

                if (isInitialDispatch && activatedConfigs.length > 0) {
                    for (const cfg of activatedConfigs) {
                        const targetType = cfg.targetType || (cfg.targetSubflowFormId ? 'subflow' : (cfg.assignedTeamId ? 'team_random' : 'user'));

                        if (targetType === 'subflow' || cfg.targetSubflowFormId) {
                            const subflowTargetId = cfg.targetSubflowFormId || cfg.sourceFormId;
                            if (subflowTargetId) {

                                const isForm = await manager.getRepository(DynamicForm).findOne({ where: { id: subflowTargetId } });
                                let childFormId = isForm ? isForm.id : (cfg.sourceFormId || submission.formId);
                                let childWfId = isForm ? isForm.workflowId : subflowTargetId;

                                if (cfg.sourceFormId) {
                                    const srcForm = await manager.getRepository(DynamicForm).findOne({ where: { id: cfg.sourceFormId } });
                                    if (srcForm) childFormId = srcForm.id;
                                }

                                const childSub = subRepo.create({
                                    formId: childFormId,
                                    workflowId: childWfId || null,
                                    requesterUserId: submission.requesterUserId,
                                    parentSubmissionId: submission.id,
                                    status: 'In Progress'
                                });
                                const savedChildSub = await subRepo.save(childSub);

                                const childStages = await stageRepo.find({
                                    where: [
                                        { workflowId: childWfId || -1, isDeleted: false },
                                        { formId: childFormId, isDeleted: false }
                                    ],
                                    order: { stepOrder: 'ASC' }
                                });

                                if (childStages.length > 0) {
                                    const firstChildStage = childStages[0];
                                    savedChildSub.currentStageId = firstChildStage.id;
                                    await subRepo.save(savedChildSub);
                                    await this.createStageStates(manager, savedChildSub, firstChildStage);
                                } else {

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
                                stageId: stage.id,
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
                                stageId: stage.id,
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

                const pendingCount = await stateRepo.count({
                    where: { submissionId: submission.id, stageId: stage.id, status: 'Pending' }
                });

                if (pendingCount > 0) {

                    return submission;
                }

                const pendingChildSubsCount = await subRepo.count({
                    where: { parentSubmissionId: submission.id, status: Not('Completed') }
                });
                if (pendingChildSubsCount > 0) {

                    return submission;
                }

                if (isMultiFormsStage && previousApprovedInStage.length > 0) {
                    const initialOwnerState = previousApprovedInStage[0];
                    const initialOwnerId = initialOwnerState.actionedByUserId || initialOwnerState.assignedUserId;

                    const isConsolidationApproval = (currentState.id !== initialOwnerState.id && currentState.assignedUserId === initialOwnerId && currentState.submissionId === submission.id);

                    if (!isConsolidationApproval) {

                        const consolidationState = stateRepo.create({
                            submissionId: submission.id,
                            stageId: stage.id,
                            assignedUserId: initialOwnerId,
                            customFormIdToFill: null,
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

                let currentWfId = stage.workflowId;
                let currentStepOrder = stage.stepOrder;
                let advanced = false;

                while (currentWfId) {

                    const nextStageInCurrentWf = await stageRepo.createQueryBuilder("stage")
                        .where("stage.workflowId = :wfId", { wfId: currentWfId })
                        .andWhere("stage.stepOrder > :stepOrder", { stepOrder: currentStepOrder })
                        .andWhere("stage.isDeleted = :isDeleted", { isDeleted: false })
                        .orderBy("stage.stepOrder", "ASC")
                        .getOne();

                    if (nextStageInCurrentWf) {

                        submission.currentStageId = nextStageInCurrentWf.id;
                        submission.status = 'In Progress';
                        await subRepo.save(submission);

                        let preferredAssigneeUserId: number | undefined = undefined;
                        if (stage?.allowChooseNextStageAssignee) {
                            if (!chosenNextAssignee) {
                                throw new Error('Debe seleccionar el destinatario para la siguiente etapa.');
                            }
                            preferredAssigneeUserId = await this.resolveChosenAssignee(manager, submission, stage, nextStageInCurrentWf, chosenNextAssignee);
                            if (!preferredAssigneeUserId) {
                                throw new Error('No se pudo determinar el destinatario para la siguiente etapa a partir de la opción seleccionada.');
                            }
                        }

                        await this.createStageStates(manager, submission, nextStageInCurrentWf, preferredAssigneeUserId);
                        advanced = true;
                        break;
                    }

                    const rootWfId = submission.workflowId || (submission.form ? submission.form.workflowId : null);
                    if (currentWfId === rootWfId || !rootWfId) {
                        break;
                    }

                    const invokingStage = await stageRepo.findOne({
                        where: { assigneeType: 'subflow', formIdToFill: currentWfId, isDeleted: false }
                    });

                    if (invokingStage && invokingStage.workflowId) {
                        currentWfId = invokingStage.workflowId;
                        currentStepOrder = invokingStage.stepOrder;
                    } else {

                        currentWfId = rootWfId;
                        currentStepOrder = submission.currentStage?.stepOrder || 0;
                    }
                }

                if (!advanced) {
                    await this.handleSubmissionCompletion(manager, submission);
                }
            } else if (action === 'reject') {
                currentState.status = 'Rejected';
                currentState.actionedByUserId = userId;
                currentState.notes = notes;
                await stateRepo.save(currentState);

                await stateRepo.update(
                    { submissionId: submission.id, stageId: stage.id, status: 'Pending' },
                    { status: 'Rejected', notes: 'Rechazado por otro aprobador' }
                );

                let targetUserId: number | null = null;
                let targetStageId: number = stage.id;
                let targetCustomFormIdToFill: number | null = null;
                const targetType = stage.rejectionTargetType || 'previous_sender';

                if (targetType === 'previous_sender') {

                    const prevState = await stateRepo.findOne({
                        where: { submissionId: submission.id, status: 'Approved' },
                        order: { updatedAt: 'DESC' },
                        relations: ['stage', 'stage.formToFill']
                    });
                    if (prevState) {
                        targetUserId = prevState.actionedByUserId || prevState.assignedUserId;
                        targetStageId = prevState.stageId;
                        targetCustomFormIdToFill = prevState.customFormIdToFill || prevState.stage?.formIdToFill || null;
                    } else if (submission.parentSubmissionId) {

                        const parentPrevState = await stateRepo.findOne({
                            where: { submissionId: submission.parentSubmissionId, status: 'Approved' },
                            order: { updatedAt: 'DESC' },
                            relations: ['stage', 'stage.formToFill']
                        });
                        if (parentPrevState) {
                            targetUserId = parentPrevState.actionedByUserId || parentPrevState.assignedUserId;
                            targetStageId = parentPrevState.stageId;
                            targetCustomFormIdToFill = parentPrevState.customFormIdToFill || parentPrevState.stage?.formIdToFill || null;
                        } else {
                            targetUserId = submission.requesterUserId;
                            targetStageId = stage.id;
                            targetCustomFormIdToFill = stage.formIdToFill || null;
                        }
                    } else {
                        targetUserId = submission.requesterUserId;
                        targetStageId = stage.id;
                        targetCustomFormIdToFill = null;
                    }
                } else if (targetType === 'specific_user') {
                    targetUserId = stage.rejectionTargetUserId;
                    targetCustomFormIdToFill = stage.formIdToFill || null;
                } else if (targetType === 'team_random' && stage.rejectionTargetTeamId) {
                    const teamUsers = await userRepo.find({
                        where: { teamId: stage.rejectionTargetTeamId, status: 1 }
                    });
                    if (teamUsers.length > 0) {
                        const randIndex = Math.floor(Math.random() * teamUsers.length);
                        targetUserId = teamUsers[randIndex].id;
                    }
                    targetCustomFormIdToFill = stage.formIdToFill || null;
                }

                if (!targetUserId) targetUserId = submission.requesterUserId;

                submission.status = 'Rejected';

                if (targetUserId === submission.requesterUserId && !targetCustomFormIdToFill && !submission.parentSubmissionId) {
                    submission.currentStageId = null;
                } else {
                    submission.currentStageId = targetStageId;
                }
                await subRepo.save(submission);

                const rejectedState = stateRepo.create({
                    submissionId: submission.id,
                    stageId: targetStageId,
                    assignedUserId: targetUserId,
                    customFormIdToFill: targetCustomFormIdToFill,
                    status: 'Pending'
                });
                await stateRepo.save(rejectedState);

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
