import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from './config/typeorm.config';
import { DynamicForm } from './models/DynamicForm';

async function run() {
    try {
        await AppDataSource.initialize();
        const forms = await AppDataSource.getRepository(DynamicForm).find();
        console.log("=== ALL FORMS ===");
        for (const form of forms) {
            console.log(`Form ID: ${form.id}, Name: "${form.name}", IsEntryForm: ${form.isEntryForm}, IsInitialForm: ${form.isInitialForm}`);
        }
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

run();
