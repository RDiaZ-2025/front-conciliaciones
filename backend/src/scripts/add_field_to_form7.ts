import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../../../backend/src/config/typeorm.config';
import { DynamicFormField } from '../../../backend/src/models/DynamicFormField';

async function add() {
    try {
        await AppDataSource.initialize();
        const repo = AppDataSource.getRepository(DynamicFormField);
        
        const existing = await repo.findOne({ where: { formId: 7 } });
        if (!existing) {
            const field = repo.create({
                formId: 7,
                name: 'campo_cargar_archivos_f7',
                label: 'Archivos',
                type: 'file',
                isRequired: true,
                isReadOnly: false,
                displayOrder: 1,
                metadata: JSON.stringify({ maxFileCount: 5, maxFileSize: 10, allowedFormats: '.pdf,.png,.jpg,.xlsx,.docx,.zip' })
            });
            await repo.save(field);
            console.log("Added file field to Form 7!");
        } else {
            console.log("Form 7 already has a field.");
        }
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

add();
