import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../../../backend/src/config/typeorm.config';

async function migrate() {
    try {
        await AppDataSource.initialize();
        const queryRunner = AppDataSource.createQueryRunner();
        
        // Check if column exists
        const table = await queryRunner.getTable("DynamicForms");
        const hasCol = table?.findColumnByName("RequireConsecutive");
        
        if (!hasCol) {
            console.log("Adding column 'RequireConsecutive' to 'DynamicForms'...");
            await queryRunner.query('ALTER TABLE "DynamicForms" ADD "RequireConsecutive" bit NOT NULL DEFAULT 1');
            console.log("Column added successfully!");
        } else {
            console.log("Column 'RequireConsecutive' already exists.");
        }
        
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

migrate();
