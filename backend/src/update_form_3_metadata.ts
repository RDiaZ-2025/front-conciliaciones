import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from './config/typeorm.config';
import { DynamicForm } from './models/DynamicForm';

async function run() {
    try {
        await AppDataSource.initialize();
        const formRepo = AppDataSource.getRepository(DynamicForm);
        const form3 = await formRepo.findOne({ where: { id: 3 } });
        if (form3) {
            const metadataObj = {
                enableConditions: [
                    {
                        fieldKeys: ["19_campo_1784775617040", "11_campo_1784395206464"],
                        operator: "contains",
                        value: "Estrategia"
                    },
                    {
                        fieldKeys: ["19_campo_1784776508802", "8_campo_1784395839397"],
                        operator: "gt",
                        value: 50000000
                    }
                ]
            };
            form3.metadata = JSON.stringify(metadataObj);
            await formRepo.save(form3);
            console.log("Metadata updated successfully for DynamicForm ID 3 (ESTRATEGIA Y PRODUCCIÓN)!");
        } else {
            console.log("Form with ID 3 not found!");
        }
        await AppDataSource.destroy();
    } catch (e) {
        console.error(e);
    }
}

run();
