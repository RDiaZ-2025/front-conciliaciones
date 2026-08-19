import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from './config/typeorm.config';
import { DynamicFormField } from './models/DynamicFormField';

async function run() {
    try {
        await AppDataSource.initialize();
        const fields = await AppDataSource.getRepository(DynamicFormField).find({
            where: { formId: 19 },
            order: { displayOrder: 'ASC', id: 'ASC' }
        });
        console.log("=== FORM 19 FIELDS ===");
        for (const f of fields) {
            console.log(`Field Name: "${f.name}", Label: "${f.label}", Type: "${f.type}"`);
        }
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

run();
