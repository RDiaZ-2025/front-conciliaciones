import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStageToProductionRequests1768940142831 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add Stage column (nullable first)
        await queryRunner.query(`ALTER TABLE "ProductionRequests" ADD "Stage" nvarchar(50)`);

        // Migrate data from Statuses if StatusId exists
        // We use a safe check or just attempt the update if we are sure.
        // Given we checked the DB, we know StatusId exists.
        await queryRunner.query(`
            UPDATE pr
            SET pr."Stage" = s."Code"
            FROM "ProductionRequests" pr
            INNER JOIN "Statuses" s ON pr."StatusId" = s."Id"
        `);

        // Set default for any nulls (e.g. invalid StatusId or no StatusId)
        await queryRunner.query(`UPDATE "ProductionRequests" SET "Stage" = 'request' WHERE "Stage" IS NULL`);

        // Make NOT NULL
        await queryRunner.query(`ALTER TABLE "ProductionRequests" ALTER COLUMN "Stage" nvarchar(50) NOT NULL`);

        // Add default constraint
        await queryRunner.query(`ALTER TABLE "ProductionRequests" ADD CONSTRAINT "DF_ProductionRequests_Stage" DEFAULT 'request' FOR "Stage"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ProductionRequests" DROP CONSTRAINT "DF_ProductionRequests_Stage"`);
        await queryRunner.query(`ALTER TABLE "ProductionRequests" DROP COLUMN "Stage"`);
    }

}
