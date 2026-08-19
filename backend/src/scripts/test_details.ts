import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../../../backend/src/config/typeorm.config';
import { ProductionService } from '../services/production.service';

async function test() {
    try {
        await AppDataSource.initialize();
        const service = new ProductionService();
        const res = await service.getSubmissionDetails(3);
        console.log("DETAILS RESULT:", JSON.stringify(res, null, 2));
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

test();
