import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from './config/typeorm.config';

async function run() {
    try {
        await AppDataSource.initialize();
        const runner = AppDataSource.createQueryRunner();
        const table = await runner.getTable('DynamicForms');
        console.log("=== DynamicForms TABLE COLUMNS ===");
        if (table) {
            for (const col of table.columns) {
                console.log(`Column Name: "${col.name}", Type: "${col.type}", Nullable: ${col.isNullable}`);
            }
        } else {
            console.log("Table DynamicForms not found!");
        }
        await runner.release();
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

run();
