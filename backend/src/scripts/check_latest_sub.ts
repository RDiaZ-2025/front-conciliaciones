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
        
        // Find latest submission
        const subs = await AppDataSource.getRepository(DynamicFormSubmission).find({
            relations: ['form'],
            order: { id: 'DESC' },
            take: 1
        });
        
        if (subs.length === 0) {
            console.log("No submissions found.");
            await AppDataSource.destroy();
            return;
        }

        const sub = subs[0];
        console.log(`Latest Submission ID: ${sub.id}, form: ${sub.form?.name}, status: ${sub.status}`);

        const states = await AppDataSource.getRepository(DynamicSubmissionWorkflowState).find({
            where: { submissionId: sub.id },
            relations: ['stage', 'assignedUser', 'actionedByUser'],
            order: { id: 'ASC' }
        });

        console.log("States:");
        for (const st of states) {
            console.log(`- State ID ${st.id}: Stage: ${st.stage?.name} (order: ${st.stage?.stepOrder}), assigned: ${st.assignedUser?.name}, status: ${st.status}, actionedBy: ${st.actionedByUser?.name}, notes: ${st.notes}`);
        }

        const values = await AppDataSource.getRepository(DynamicFormFieldValue).find({
            where: { submissionId: sub.id },
            relations: ['field', 'field.form']
        });

        console.log("\nSaved values:");
        for (const v of values) {
            console.log(`- Field: ${v.field?.name} (Form: ${v.field?.form?.name}), Value: ${v.value}`);
        }

        await AppDataSource.destroy();
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
