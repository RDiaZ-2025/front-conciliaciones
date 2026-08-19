import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../config/typeorm.config';
import { ProductionService } from '../services/production.service';

async function run() {
    try {
        await AppDataSource.initialize();
        
        const service = new ProductionService();
        console.log("Calling actionApproval for State 48...");
        
        const stateId = 48;
        const userId = 96; // Secuoya user ID
        const result = await service.actionApproval(
            stateId,
            userId,
            'approve',
            'test secuoya approval comments',
            { 'campo_cargar_archivos_f7': '[]' }
        );

        console.log("Success! Result submission status:", result.status);

        await AppDataSource.destroy();
    } catch (e) {
        console.error("Error during approval:", e);
    }
}

run();
