import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from './config/typeorm.config';
import { ProductionService } from './services/production.service';

async function run() {
    try {
        await AppDataSource.initialize();
        const service = new ProductionService();
        // Assume user id 1
        const tasks = await service.getPendingApprovals(91); // Michael QA is ID 91
        console.log("Tasks for User 91:", tasks.map(t => t.stateId));
        const task = tasks.find(t => t.stateId === 43);
        if (task) {
            console.log(`\n================ TASK ID: ${task.stateId}, Form: ${task.formName}, Stage: ${task.stageName} ================`);
            console.log(`- values length: ${task.values?.length}`);
            console.log(`- parentValues length: ${task.parentValues?.length}`);
            console.log(`- stageValues length: ${task.stageValues?.length}`);
            console.log("Parent Values:", JSON.stringify(task.parentValues, null, 2));
        } else {
            console.log("Task 43 not found for user 91!");
        }
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

run();
