import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../../../backend/src/config/typeorm.config';
import { DynamicFormField } from '../../../backend/src/models/DynamicFormField';

async function view() {
    try {
        await AppDataSource.initialize();
        const repo = AppDataSource.getRepository(DynamicFormField);
        const fields = await repo.find({
            relations: ['form']
        });
        console.log("FIELDS IN DB:");
        for (const f of fields) {
            console.log(`ID: ${f.id}, Form: "${f.form ? f.form.name : 'N/A'}" (ID: ${f.formId}), Label: "${f.label}", Name: "${f.name}", Type: "${f.type}"`);
        }
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

view();
