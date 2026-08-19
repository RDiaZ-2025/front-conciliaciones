import { AppDataSource } from '../config/typeorm.config';
import { DynamicForm } from '../models/DynamicForm';
import { DynamicFormField } from '../models/DynamicFormField';
import { DynamicWorkflowStage } from '../models/DynamicWorkflowStage';

async function checkDataForm() {
    await AppDataSource.initialize();
    
    // Find form
    const formRepo = AppDataSource.getRepository(DynamicForm);
    const form = await formRepo.findOne({ where: { name: 'DATA' } });
    
    if (!form) {
        console.log('Formulario DATA no encontrado.');
        await AppDataSource.destroy();
        return;
    }
    
    console.log('--- FORMULARIO ---');
    console.log('ID:', form.id);
    console.log('Nombre:', form.name);
    console.log('IsActive:', form.isActive);
    console.log('IsEntryForm:', form.isEntryForm);
    
    // Find fields
    const fieldRepo = AppDataSource.getRepository(DynamicFormField);
    const fields = await fieldRepo.find({ where: { formId: form.id } });
    console.log('\n--- CAMPOS ---');
    fields.forEach(f => {
        console.log(`- ID: ${f.id}, Name: ${f.name}, Label: ${f.label}, IsRequired: ${f.isRequired}, IsActive: ${f.isActive}`);
    });
    
    // Find workflow stages
    const stageRepo = AppDataSource.getRepository(DynamicWorkflowStage);
    const stages = await stageRepo.find({ where: { formId: form.id } });
    console.log('\n--- ETAPAS DE FLUJO ---');
    stages.forEach(s => {
        console.log(`- ID: ${s.id}, Name: ${s.name}, StepOrder: ${s.stepOrder}, AssigneeType: ${s.assigneeType}, AssigneeUserId: ${s.assigneeUserId}, FormIdToFill: ${s.formIdToFill}`);
    });
    
    await AppDataSource.destroy();
}

checkDataForm().catch(console.error);
