import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from './config/typeorm.config';
import { DynamicFormSubmission } from './models/DynamicFormSubmission';

async function run() {
    try {
        await AppDataSource.initialize();
        const sub = await AppDataSource.getRepository(DynamicFormSubmission).findOne({
            where: { id: 48 },
            relations: ['form', 'values', 'values.field'],
        });
        if (sub) {
            console.log(`\n================ SUBMISSION ID ${sub.id}: Form ${sub.form?.name} ================`);
            console.log(`Status: ${sub.status}, Parent ID: ${sub.parentSubmissionId}`);
            for (const val of sub.values) {
                console.log(`- Field Name: ${val.field?.name}, Label: ${val.field?.label}, Type: ${val.field?.type}, Value: ${val.value}`);
            }
        } else {
            console.log("Submission 48 not found!");
        }
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

run();
