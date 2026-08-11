import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from './config/typeorm.config';
import { DynamicFormSubmission } from './models/DynamicFormSubmission';
import { DynamicFormFieldValue } from './models/DynamicFormFieldValue';

async function run() {
    try {
        await AppDataSource.initialize();
        const subs = await AppDataSource.getRepository(DynamicFormSubmission).find({
            relations: ['form', 'values', 'values.field'],
            order: { id: 'DESC' },
            take: 3
        });
        for (const sub of subs) {
            console.log(`\n================ SUBMISSION ID ${sub.id}: Form ${sub.form?.name} ================`);
            console.log(`Status: ${sub.status}, Parent ID: ${sub.parentSubmissionId}`);
            for (const val of sub.values) {
                console.log(`- Field Name: ${val.field?.name}, Label: ${val.field?.label}, Type: ${val.field?.type}, Value: ${val.value}`);
            }
        }
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

run();
