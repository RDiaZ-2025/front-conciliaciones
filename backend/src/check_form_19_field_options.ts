import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from './config/typeorm.config';
import { DynamicFormField } from './models/DynamicFormField';

async function run() {
    try {
        await AppDataSource.initialize();
        const field = await AppDataSource.getRepository(DynamicFormField).findOne({
            where: { formId: 19, name: 'campo_1784775617040' }
        });
        if (field) {
            console.log("Field Label:", field.label);
            console.log("Field Type:", field.type);
            console.log("Field Metadata:", field.metadata);
        } else {
            console.log("Field not found!");
        }
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

run();
