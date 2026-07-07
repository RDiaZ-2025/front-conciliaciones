import { AppDataSource } from '../config/typeorm.config';
import { User } from '../models/User';

async function findUser() {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { email: 'michael.velasco.amaya@gmail.com' } });
    if (user) {
        console.log('Michael QA User:', user);
    } else {
        console.log('Michael QA User not found by email');
    }
    await AppDataSource.destroy();
}

findUser().catch(console.error);
