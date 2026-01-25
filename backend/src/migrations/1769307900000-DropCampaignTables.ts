import { MigrationInterface, QueryRunner } from "typeorm";

export class DropCampaignTables1769307900000 implements MigrationInterface {
    name = 'DropCampaignTables1769307900000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop tables if they exist
        await queryRunner.query(`DROP TABLE IF EXISTS "CampaignCopies"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "CampaignImpacts"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "CampaignLogs"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('Down migration for DropCampaignTables not implemented as tables are being removed permanently.');
    }

}
