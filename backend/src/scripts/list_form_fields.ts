import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../config/typeorm.config';
import { DynamicFormField } from '../models/DynamicFormField';

async function test() {
    try {
        await AppDataSource.initialize();
        const fields = await AppDataSource.getRepository(DynamicFormField).find({
            where: { formId: 6 },
            relations: ['form']
        });
        console.log("FIELDS FOR FORM 6:", JSON.stringify(fields, null, 2));
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

test();
