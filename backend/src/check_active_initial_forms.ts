import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from './config/typeorm.config';
import { DynamicForm } from './models/DynamicForm';

async function run() {
    try {
        await AppDataSource.initialize();
        const forms = await AppDataSource.getRepository(DynamicForm).find({
            where: { isInitialForm: true, isActive: true },
            order: { displayOrder: 'ASC', id: 'ASC' }
        });
        console.log("=== ACTIVE INITIAL FORMS ===");
        for (const f of forms) {
            console.log(`Form ID: ${f.id}, Name: "${f.name}", DisplayOrder: ${f.displayOrder}`);
        }
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

run();
