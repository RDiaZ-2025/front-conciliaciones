import { AppDataSource } from '../config/typeorm.config';
import { User } from '../models/User';
import { DynamicWorkflowStage } from '../models/DynamicWorkflowStage';

async function checkAssignee() {
    await AppDataSource.initialize();
    
    // Check user with ID 98
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: 98 } });
    if (user) {
        console.log('Usuario 98 existe:', user.name, user.email);
    } else {
        console.log('¡ERROR! El usuario con ID 98 NO existe en la base de datos.');
    }
    
    // Check all workflow stages and see if their assignee users exist
    const stageRepo = AppDataSource.getRepository(DynamicWorkflowStage);
    const stages = await stageRepo.find({ relations: ['form'] });
    console.log('\n--- ETAPAS DE FLUJO Y SUS ASIGNADOS ---');
    for (const s of stages) {
        if (s.assigneeType === 'specific_user' && s.assigneeUserId) {
            const u = await userRepo.findOne({ where: { id: s.assigneeUserId } });
            console.log(`Form: ${s.form.name}, Stage: ${s.name}, AssigneeUserId: ${s.assigneeUserId}, Existe: ${!!u} (${u?.name || 'N/A'})`);
        } else {
            console.log(`Form: ${s.form.name}, Stage: ${s.name}, AssigneeType: ${s.assigneeType}`);
        }
    }
    
    await AppDataSource.destroy();
}

checkAssignee().catch(console.error);
