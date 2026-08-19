import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../../../backend/src/config/typeorm.config';
import { DynamicWorkflowStage } from '../../../backend/src/models/DynamicWorkflowStage';

async function view() {
    try {
        await AppDataSource.initialize();
        const repo = AppDataSource.getRepository(DynamicWorkflowStage);
        const stages = await repo.find({
            relations: ['form']
        });
        console.log("STAGES IN DB:");
        for (const s of stages) {
            console.log(`ID: ${s.id}, Name: "${s.name}", Form: "${s.form ? s.form.name : 'N/A'}", stepOrder: ${s.stepOrder}`);
        }
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

view();
