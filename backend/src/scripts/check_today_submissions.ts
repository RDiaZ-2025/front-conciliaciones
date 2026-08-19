import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../config/typeorm.config';
import { DynamicFormSubmission } from '../models/DynamicFormSubmission';
import { DynamicSubmissionWorkflowState } from '../models/DynamicSubmissionWorkflowState';
import { DynamicFormFieldValue } from '../models/DynamicFormFieldValue';

async function run() {
    try {
        await AppDataSource.initialize();
        
        console.log("=== SUBMISSIONS FROM TODAY ===");
        const subs = await AppDataSource.getRepository(DynamicFormSubmission).find({
            relations: ['form', 'requesterUser'],
            order: { id: 'DESC' },
            take: 20
        });

        for (const s of subs) {
            console.log(`Sub ID: ${s.id}, Form: ${s.form?.name} (id: ${s.formId}), Parent: ${s.parentSubmissionId}, Requester: ${s.requesterUser?.name}, Status: ${s.status}, CreatedAt: ${s.createdAt}`);
            const states = await AppDataSource.getRepository(DynamicSubmissionWorkflowState).find({
                where: { submissionId: s.id },
                relations: ['stage', 'assignedUser', 'actionedByUser']
            });
            if (states.length > 0) {
                console.log("  States:");
                for (const st of states) {
                    console.log(`    - State ID ${st.id}: Stage: ${st.stage?.name} (order: ${st.stage?.stepOrder}), assigned: ${st.assignedUser?.name}, status: ${st.status}, actionedBy: ${st.actionedByUser?.name}, notes: ${st.notes}`);
                }
            }
        }

        await AppDataSource.destroy();
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
