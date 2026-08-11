import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from './config/typeorm.config';
import { DynamicSubmissionWorkflowState } from './models/DynamicSubmissionWorkflowState';

async function run() {
    try {
        await AppDataSource.initialize();
        const states = await AppDataSource.getRepository(DynamicSubmissionWorkflowState).find({
            where: { status: 'Pending' },
            relations: ['submission', 'submission.form', 'assignedUser', 'stage']
        });
        console.log("=== PENDING STATES ===");
        for (const state of states) {
            console.log(`State ID: ${state.id}, Submission ID: ${state.submissionId}, Form: ${state.submission?.form?.name}, Stage: ${state.stage?.name}, Assigned User: ${state.assignedUser?.name} (ID: ${state.assignedUserId})`);
        }
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

run();
