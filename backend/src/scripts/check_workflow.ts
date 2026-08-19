import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../config/typeorm.config';
import { DynamicWorkflowStage } from '../models/DynamicWorkflowStage';
import { DynamicSubmissionWorkflowState } from '../models/DynamicSubmissionWorkflowState';
import { DynamicFormSubmission } from '../models/DynamicFormSubmission';
import { User } from '../models/User';

async function run() {
    try {
        await AppDataSource.initialize();
        
        console.log("=== WORKFLOW STAGES ===");
        const stages = await AppDataSource.getRepository(DynamicWorkflowStage).find({
            relations: ['form', 'formToFill', 'assigneeUser', 'assigneeTeam'],
            order: { formId: 'ASC', stepOrder: 'ASC' }
        });
        console.log("Stages:", stages.map((s: any) => ({
            id: s.id,
            formName: s.form?.name,
            name: s.name,
            stepOrder: s.stepOrder,
            assigneeType: s.assigneeType,
            assigneeUser: s.assigneeUser?.name,
            assigneeTeam: s.assigneeTeam?.name,
            isDeleted: s.isDeleted
        })));

        console.log("\n=== FORM SUBMISSIONS ===");
        const subs = await AppDataSource.getRepository(DynamicFormSubmission).find({
            relations: ['form', 'requesterUser'],
            order: { id: 'DESC' },
            take: 10
        });
        console.log("Submissions:", subs.map((s: any) => ({
            id: s.id,
            formName: s.form?.name,
            requester: s.requesterUser?.name,
            status: s.status,
            currentStageId: s.currentStageId
        })));

        console.log("\n=== ACTIVE/PENDING WORKFLOW STATES ===");
        const states = await AppDataSource.getRepository(DynamicSubmissionWorkflowState).find({
            relations: ['submission', 'stage', 'assignedUser', 'actionedByUser'],
            order: { id: 'DESC' },
            take: 20
        });
        console.log("States:", states.map((st: any) => ({
            id: st.id,
            submissionId: st.submissionId,
            formName: st.submission?.form?.name,
            stageName: st.stage?.name,
            stepOrder: st.stage?.stepOrder,
            assignedUser: st.assignedUser?.name,
            assignedUserId: st.assignedUserId,
            status: st.status,
            actionedByUser: st.actionedByUser?.name,
            notes: st.notes,
            updatedAt: st.updatedAt
        })));

        await AppDataSource.destroy();
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
