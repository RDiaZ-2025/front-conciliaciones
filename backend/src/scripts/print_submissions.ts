import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../../../backend/src/config/typeorm.config';
import { DynamicFormSubmission } from '../../../backend/src/models/DynamicFormSubmission';
import { DynamicFormFieldValue } from '../../../backend/src/models/DynamicFormFieldValue';

async function test() {
    try {
        await AppDataSource.initialize();
        const subs = await AppDataSource.getRepository(DynamicFormSubmission).find({
            relations: ['form']
        });
        const valRepo = AppDataSource.getRepository(DynamicFormFieldValue);

        for (const sub of subs) {
            console.log(`SUBMISSION ID: ${sub.id}, FORM: ${sub.form.name}, STATUS: ${sub.status}, CREATED: ${sub.createdAt}`);
            const values = await valRepo.find({
                where: { submissionId: sub.id },
                relations: ['field', 'field.form']
            });
            for (const v of values) {
                console.log(`  - FIELD [${v.field?.form?.name}]: ${v.field?.label} (${v.field?.type}) = ${v.value}`);
            }
        }
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

test();
