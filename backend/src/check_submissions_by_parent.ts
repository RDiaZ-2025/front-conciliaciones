import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from './config/typeorm.config';
import { DynamicFormSubmission } from './models/DynamicFormSubmission';

async function run() {
    try {
        await AppDataSource.initialize();
        const subs = await AppDataSource.getRepository(DynamicFormSubmission).find({
            where: [
                { id: 40 },
                { parentSubmissionId: 40 }
            ],
            relations: ['form']
        });
        console.log("=== SUBMISSIONS LINKED TO 40 ===");
        for (const sub of subs) {
            console.log(`Sub ID: ${sub.id}, Form ID: ${sub.formId}, Form Name: "${sub.form?.name}", Parent ID: ${sub.parentSubmissionId}`);
        }
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

run();
