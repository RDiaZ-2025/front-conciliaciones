import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../config/typeorm.config';
import { User } from '../models/User';
import { ProductionService } from '../services/production.service';

const service = new ProductionService();

async function run() {
    try {
        await AppDataSource.initialize();
        
        const luisa = await AppDataSource.getRepository(User).findOne({
            where: { name: 'Luisa Fajardo' }
        });
        if (!luisa) {
            console.log("User Luisa Fajardo not found!");
            await AppDataSource.destroy();
            return;
        }

        console.log(`=== PENDING APPROVALS FOR ${luisa.name} (ID: ${luisa.id}) ===`);
        const approvals = await service.getPendingApprovals(luisa.id);
        console.log("Approvals:", JSON.stringify(approvals, null, 2));

        await AppDataSource.destroy();
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
