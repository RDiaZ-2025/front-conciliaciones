import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../../../backend/src/config/typeorm.config';
import { DynamicFormFieldValue } from '../../../backend/src/models/DynamicFormFieldValue';

async function view() {
    try {
        await AppDataSource.initialize();
        const repo = AppDataSource.getRepository(DynamicFormFieldValue);
        const values = await repo.find({
            relations: ['field', 'field.form']
        });
        console.log("VALUES IN DB:");
        for (const v of values) {
            console.log(`ID: ${v.id}, SubID: ${v.submissionId}, Form: "${v.field?.form?.name}", Field: "${v.field?.label}" (Type: ${v.field?.type}), Value: "${v.value}"`);
        }
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

view();
