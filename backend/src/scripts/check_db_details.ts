import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../config/typeorm.config';
import { DynamicFormSubmission } from '../models/DynamicFormSubmission';
import { DynamicSubmissionWorkflowState } from '../models/DynamicSubmissionWorkflowState';
import { DynamicFormFieldValue } from '../models/DynamicFormFieldValue';
import { DynamicFormField } from '../models/DynamicFormField';

async function run() {
    try {
        await AppDataSource.initialize();
        
        const subId = 66; // Let's check submission 66 specifically
        console.log(`=== SUBMISSION ${subId} ===`);
        const sub = await AppDataSource.getRepository(DynamicFormSubmission).findOne({
            where: { id: subId },
            relations: ['form']
        });
        if (!sub) {
            console.log("Submission 66 not found.");
            await AppDataSource.destroy();
            return;
        }

        console.log(`Form name: ${sub.form?.name}, parentSubmissionId: ${sub.parentSubmissionId}`);

        // Find all fields for this form
        const fields = await AppDataSource.getRepository(DynamicFormField).find({
            where: { formId: sub.formId }
        });
        console.log("Fields:", fields.map(f => ({ id: f.id, name: f.name, label: f.label })));

        // Find all values for this submission
        const values = await AppDataSource.getRepository(DynamicFormFieldValue).find({
            where: { submissionId: subId }
        });
        console.log("Values for this submission:", values);

        // Find all values in the DB to see if they were saved under a different submission
        const allVals = await AppDataSource.getRepository(DynamicFormFieldValue).find({
            relations: ['field', 'field.form'],
            order: { id: 'DESC' },
            take: 20
        });
        console.log("\nRecent values in DB:", allVals.map(v => ({
            id: v.id,
            submissionId: v.submissionId,
            field: v.field?.name,
            form: v.field?.form?.name,
            value: v.value
        })));

        await AppDataSource.destroy();
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
