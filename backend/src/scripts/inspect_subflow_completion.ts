import { AppDataSource } from '../config/typeorm.config';
import { DynamicFormSubmission } from '../models/DynamicFormSubmission';
import { DynamicSubmissionWorkflowState } from '../models/DynamicSubmissionWorkflowState';
import { DynamicWorkflowStage } from '../models/DynamicWorkflowStage';

async function run() {
    await AppDataSource.initialize();
    const subRepo = AppDataSource.getRepository(DynamicFormSubmission);
    const stateRepo = AppDataSource.getRepository(DynamicSubmissionWorkflowState);
    const stageRepo = AppDataSource.getRepository(DynamicWorkflowStage);

    console.log("=== All Submissions in DB ===");
    const subs = await subRepo.find({
        relations: ['form', 'currentStage', 'workflow'],
        order: { id: 'ASC' }
    });

    for (const sub of subs) {
        console.log(`\nSubmission ID: ${sub.id}, ParentSubId: ${sub.parentSubmissionId}, Status: "${sub.status}", Consecutive: "${sub.consecutive}"`);
        console.log(`  Form: ID=${sub.formId}, Name="${sub.form?.name}", WF_ID=${sub.workflowId}`);
        console.log(`  CurrentStage: ID=${sub.currentStageId}, Name="${sub.currentStage?.name}", StepOrder=${sub.currentStage?.stepOrder}`);

        const states = await stateRepo.find({
            where: { submissionId: sub.id },
            relations: ['stage', 'assignedUser', 'actionedByUser'],
            order: { id: 'ASC' }
        });
        console.log(`  States (${states.length}):`);
        states.forEach(st => {
            console.log(`    - StateId ${st.id}: Stage "${st.stage?.name}" (Step ${st.stage?.stepOrder}), Status: ${st.status}, Assigned: ${st.assignedUser?.name}, ActionedBy: ${st.actionedByUser?.name}`);
        });
    }

    await AppDataSource.destroy();
}

run().catch(console.error);
