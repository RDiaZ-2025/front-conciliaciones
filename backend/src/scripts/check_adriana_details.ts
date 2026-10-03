import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../config/typeorm.config';
import { ProductionService } from '../services/production.service';

async function checkAdrianaSubmissions() {
    try {
        await AppDataSource.initialize();
        const service = new ProductionService();

        // 1. Get Adriana's user
        const adriana = await AppDataSource.query(`SELECT * FROM Users WHERE Email = 'adriana.vega@redmasnoticias.com'`);
        console.log("Adriana user:", adriana);
        const adrianaId = adriana[0].id;

        // 2. What does getSubmissionDetails(633) return?
        console.log("\n=== getSubmissionDetails(633) ===");
        const details633 = await service.getSubmissionDetails(633);
        console.log("historyStages in 633:", details633.historyStages);

        // 3. What does getSubmissionDetails(632) return?
        console.log("\n=== getSubmissionDetails(632) ===");
        const details632 = await service.getSubmissionDetails(632);
        console.log("historyStages count in 632:", details632.historyStages?.length);
        console.log("historyStages in 632:", details632.historyStages?.map((s: any) => ({
            stageName: s.stageName,
            status: s.status,
            actionedByName: s.actionedByUserName,
            notes: s.notes
        })));

        // 4. What does getPendingApprovals(107) return for Paloma regarding 633?
        console.log("\n=== getPendingApprovals(107) for Paloma ===");
        const pendingPaloma: any = await service.getPendingApprovals(107);
        const task633 = (pendingPaloma.data || pendingPaloma).find((t: any) => t.submissionId === 633);
        console.log("Task 633 for Paloma:", {
            submissionId: task633?.submissionId,
            stageName: task633?.stageName,
            status: task633?.status,
            historyStagesCount: task633?.historyStages?.length,
            historyStages: task633?.historyStages?.map((s: any) => ({
                stageName: s.stageName,
                status: s.status,
                actionedByName: s.actionedByUserName,
                notes: s.notes
            }))
        });

        // 5. What does getSubmissions(adrianaId) return?
        console.log("\n=== getSubmissions for Adriana (id: " + adrianaId + ") ===");
        const subsAdriana: any = await service.getSubmissions(adrianaId);
        console.log("Adriana submissions:", (subsAdriana.data || subsAdriana).map((s: any) => ({
            id: s.id,
            formName: s.form?.name || s.formName,
            status: s.status,
            consecutive: s.consecutive,
            parentId: s.parentSubmissionId
        })));

        await AppDataSource.destroy();
    } catch (e) {
        console.error("Error:", e);
    }
}

checkAdrianaSubmissions();
