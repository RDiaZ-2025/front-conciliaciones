import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../config/typeorm.config';
import { DynamicForm } from '../models/DynamicForm';

async function run() {
    try {
        await AppDataSource.initialize();
        
        const forms = await AppDataSource.getRepository(DynamicForm).find({
            order: { id: 'ASC' }
        });
        console.log("=== ALL FORMS ===");
        console.log(forms.map(f => ({
            id: f.id,
            name: f.name,
            isInitialForm: f.isInitialForm,
            isEntryForm: f.isEntryForm,
            responsible: f.responsible
        })));

        await AppDataSource.destroy();
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
