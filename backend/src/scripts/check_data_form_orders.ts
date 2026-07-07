import { AppDataSource } from '../config/typeorm.config';
import { DynamicFormField } from '../models/DynamicFormField';

async function checkDataForm() {
    await AppDataSource.initialize();
    
    // Find fields ordered by displayOrder
    const fieldRepo = AppDataSource.getRepository(DynamicFormField);
    const fields = await fieldRepo.find({ where: { formId: 2 }, order: { displayOrder: 'ASC' } });
    console.log('\n--- CAMPOS ORDENADOS ---');
    fields.forEach(f => {
        console.log(`Order: ${f.displayOrder}, ID: ${f.id}, Name: ${f.name}, Label: ${f.label}, IsRequired: ${f.isRequired}, IsReadOnly: ${f.isReadOnly}, IsActive: ${f.isActive}`);
    });
    
    await AppDataSource.destroy();
}

checkDataForm().catch(console.error);
