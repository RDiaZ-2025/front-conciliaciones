import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../../../backend/src/config/typeorm.config';
import { DynamicForm } from '../../../backend/src/models/DynamicForm';

async function updateIcons() {
    try {
        await AppDataSource.initialize();
        const repo = AppDataSource.getRepository(DynamicForm);
        const forms = await repo.find();
        
        console.log("Found forms in database:", forms.map(f => f.name));

        for (const form of forms) {
            const n = form.name.toUpperCase();
            if (n.includes('CONTENT')) {
                form.icon = 'pi pi-file-edit text-orange-500';
            } else if (n.includes('DATA')) {
                form.icon = 'pi pi-database text-blue-500';
            } else if (n.includes('ESTRATEGIA')) {
                form.icon = 'pi pi-lightbulb text-yellow-500';
            } else if (n.includes('IMPLEMENTACIÓN')) {
                form.icon = 'pi pi-rocket text-red-500';
            } else if (n.includes('TRÁFICO')) {
                form.icon = 'pi pi-chart-line text-green-500';
            } else {
                form.icon = 'pi pi-tag text-secondary';
            }
            console.log(`Setting icon for "${form.name}": "${form.icon}"`);
            await repo.save(form);
        }

        console.log("Database icons updated successfully!");
        await AppDataSource.destroy();
    } catch (e) {
        console.error("Error:", e);
    }
}

updateIcons();
