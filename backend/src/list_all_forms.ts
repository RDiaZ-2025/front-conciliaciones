import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from './config/typeorm.config';
import { DynamicForm } from './models/DynamicForm';

async function run() {
    try {
        await AppDataSource.initialize();
        const forms = await AppDataSource.getRepository(DynamicForm).find({
            relations: ['fields']
        });
        for (const form of forms) {
            console.log(`\n================ FORM ID ${form.id}: ${form.name} ================`);
            const sortedFields = form.fields.sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
            for (const field of sortedFields) {
                console.log(`- Field ID: ${field.id}, Name: ${field.name}, Label: ${field.label}, Type: ${field.type}, Active: ${field.isActive}`);
            }
        }
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

run();
