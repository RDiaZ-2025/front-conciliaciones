import { AppDataSource } from '../config/typeorm.config';
import { DynamicFormField } from '../models/DynamicFormField';

async function checkFieldTypes() {
    await AppDataSource.initialize();
    
    // Find fields of form 2
    const fieldRepo = AppDataSource.getRepository(DynamicFormField);
    const fields = await fieldRepo.find({ where: { formId: 2 } });
    console.log('\n--- TIPOS DE CAMPOS ---');
    fields.forEach(f => {
        console.log(`ID: ${f.id}, Name: ${f.name}, Label: ${f.label}, Type: ${f.type}`);
    });
    
    await AppDataSource.destroy();
}

checkFieldTypes().catch(console.error);
