import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from './config/typeorm.config';

async function run() {
    try {
        await AppDataSource.initialize();
        console.log("Database initialized. Adding column...");
        await AppDataSource.query("ALTER TABLE DynamicForms ADD Metadata NVARCHAR(MAX) NULL;");
        console.log("Column 'Metadata' added successfully to 'DynamicForms' table!");
        await AppDataSource.destroy();
    } catch (e) {
        console.error("Error adding column:", e);
    }
}

run();
