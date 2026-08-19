import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../../../backend/src/config/typeorm.config';
import { DynamicForm } from '../../../backend/src/models/DynamicForm';

async function view() {
    try {
        await AppDataSource.initialize();
        const repo = AppDataSource.getRepository(DynamicForm);
        const forms = await repo.find();
        console.log("FORMS IN DB:");
        for (const f of forms) {
            console.log(`ID: ${f.id}, Name: "${f.name}", IsEntryForm: ${f.isEntryForm}`);
        }
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

view();
