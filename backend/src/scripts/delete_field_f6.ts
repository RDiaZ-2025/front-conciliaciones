import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../config/typeorm.config';
import { DynamicFormField } from '../models/DynamicFormField';
import { DynamicFormFieldValue } from '../models/DynamicFormFieldValue';

async function test() {
    try {
        await AppDataSource.initialize();
        
        const valRepo = AppDataSource.getRepository(DynamicFormFieldValue);
        const fieldRepo = AppDataSource.getRepository(DynamicFormField);

        console.log("Deleting values for field 21...");
        await valRepo.delete({ fieldId: 21 });

        console.log("Deleting field 21 from Form 6...");
        await fieldRepo.delete({ id: 21 });

        console.log("Clean up successful!");
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

test();
