import { AppDataSource } from '../config/typeorm.config';
import { DynamicFormField } from '../models/DynamicFormField';

async function checkDataForm() {
    await AppDataSource.initialize();
    
    // Find fields
    const fieldRepo = AppDataSource.getRepository(DynamicFormField);
    const fields = await fieldRepo.find({ where: { formId: 2 } });
    console.log('\n--- CAMPOS DETALLADOS ---');
    fields.forEach(f => {
        console.log({
            id: f.id,
            name: f.name,
            label: f.label,
            isRequired: f.isRequired,
            isReadOnly: f.isReadOnly,
            isActive: f.isActive,
            defaultValueExpression: f.defaultValueExpression,
        });
    });
    
    await AppDataSource.destroy();
}

checkDataForm().catch(console.error);
