import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeFormIdNullableInWorkflowStages1794000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("DynamicWorkflowStages");
        if (table && table.findColumnByName("FormId")) {
            await queryRunner.query(`ALTER TABLE "DynamicWorkflowStages" ALTER COLUMN "FormId" int NULL`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("DynamicWorkflowStages");
        if (table && table.findColumnByName("FormId")) {
            await queryRunner.query(`ALTER TABLE "DynamicWorkflowStages" ALTER COLUMN "FormId" int NOT NULL`);
        }
    }
}
