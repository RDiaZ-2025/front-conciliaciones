import { AppDataSource } from '../config/typeorm.config';
import { DynamicFormSubmission } from '../models/DynamicFormSubmission';

async function listRecent() {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(DynamicFormSubmission);
    const subs = await repo.find({
        order: { id: 'DESC' },
        take: 10,
        relations: ['form', 'currentStage', 'requesterUser']
    });
    console.log('\n--- ÚLTIMAS 10 SOLICITUDES ---');
    subs.forEach(s => {
        console.log(`ID: ${s.id}, Form: ${s.form.name}, Status: ${s.status}, CreatedAt: ${s.createdAt.toISOString()}, Requester: ${s.requesterUser?.name || 'N/A'}`);
    });
    await AppDataSource.destroy();
}

listRecent().catch(console.error);
