import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../config/typeorm.config';
import { DynamicFormFieldValue } from '../models/DynamicFormFieldValue';
import { DynamicSubmissionWorkflowState } from '../models/DynamicSubmissionWorkflowState';
import { DynamicFormSubmission } from '../models/DynamicFormSubmission';
import { ProductionRequestHistory } from '../models/ProductionRequestHistory';
import { ProductionRequest } from '../models/ProductionRequest';

async function run() {
    try {
        await AppDataSource.initialize();
        console.log('Database initialized.');

        await AppDataSource.transaction(async (manager) => {
            console.log('Deleting DynamicFormFieldValues...');
            await manager.createQueryBuilder().delete().from(DynamicFormFieldValue).execute();

            console.log('Deleting DynamicSubmissionWorkflowStates...');
            await manager.createQueryBuilder().delete().from(DynamicSubmissionWorkflowState).execute();

            console.log('Deleting DynamicFormSubmissions...');
            await manager.createQueryBuilder().delete().from(DynamicFormSubmission).execute();

            console.log('Deleting ProductionRequestHistories...');
            await manager.createQueryBuilder().delete().from(ProductionRequestHistory).execute();

            console.log('Deleting ProductionRequests...');
            await manager.createQueryBuilder().delete().from(ProductionRequest).execute();
        });

        console.log('All requests and submissions have been deleted successfully.');
        await AppDataSource.destroy();
    } catch (error) {
        console.error('Error deleting requests:', error);
        process.exit(1);
    }
}

run();
