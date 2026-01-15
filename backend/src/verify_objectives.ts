import { AppDataSource, initializeDatabase } from './config/typeorm.config';
import { Objective } from './models/Objective';

async function verify() {
    try {
        await initializeDatabase();
        console.log('Database initialized');
        const repo = AppDataSource.getRepository(Objective);
        const objectives = await repo.find();
        console.log('Objectives found:', objectives);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

verify();
