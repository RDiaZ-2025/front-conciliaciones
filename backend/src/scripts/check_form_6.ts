import { AppDataSource } from '../config/typeorm.config';
import { DynamicForm } from '../models/DynamicForm';

async function checkForm6() {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(DynamicForm);
    const form = await repo.findOne({ where: { id: 6 } });
    if (form) {
        console.log('Form 6 exists:', form.name);
    } else {
        console.log('¡ERROR! Form 6 does NOT exist in the database!');
    }
    await AppDataSource.destroy();
}

checkForm6().catch(console.error);
