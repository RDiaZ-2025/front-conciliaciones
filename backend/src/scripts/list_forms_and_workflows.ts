import { AppDataSource } from '../config/typeorm.config';
import { DynamicForm } from '../models/DynamicForm';
import { DynamicWorkflow } from '../models/DynamicWorkflow';

async function run() {
    await AppDataSource.initialize();
    const forms = await AppDataSource.getRepository(DynamicForm).find();
    console.log('--- FORMS ---');
    for (const f of forms) {
        console.log(`Form ID: ${f.id}, Name: ${f.name}, isEntry: ${f.isEntryForm}, isInitial: ${f.isInitialForm}, workflowId: ${f.workflowId}`);
    }
    const wfs = await AppDataSource.getRepository(DynamicWorkflow).find();
    console.log('\n--- WORKFLOWS ---');
    for (const w of wfs) {
        console.log(`Workflow ID: ${w.id}, Name: ${w.name}, isActive: ${w.isActive}`);
    }
    await AppDataSource.destroy();
}
run().catch(console.error);
