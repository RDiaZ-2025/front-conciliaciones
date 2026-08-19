import { AppDataSource } from '../config/typeorm.config';
import { DynamicForm } from '../models/DynamicForm';
import { DynamicWorkflow } from '../models/DynamicWorkflow';

async function syncEntryFormsWithWorkflows() {
    await AppDataSource.initialize();
    const formRepo = AppDataSource.getRepository(DynamicForm);
    const wfRepo = AppDataSource.getRepository(DynamicWorkflow);

    const forms = await formRepo.find({ where: { isEntryForm: true, isInitialForm: false } });
    for (const f of forms) {
        if (!f.workflowId) {
            const wfName = `Flujo: ${f.name}`;
            let wf = await wfRepo.findOne({ where: { name: wfName } });
            if (!wf) {
                wf = wfRepo.create({
                    name: wfName,
                    description: f.description || `Flujo para ${f.name}`,
                    isActive: true
                });
                wf = await wfRepo.save(wf);
                console.log(`Created workflow: "${wf.name}" (ID: ${wf.id}) for Form ID: ${f.id}`);
            }
            await formRepo.update({ id: f.id }, { workflowId: wf.id });
            console.log(`Linked Form "${f.name}" (ID: ${f.id}) to Workflow ID: ${wf.id}`);
        }
    }

    await AppDataSource.destroy();
    console.log('Sync complete!');
}

syncEntryFormsWithWorkflows().catch(console.error);
