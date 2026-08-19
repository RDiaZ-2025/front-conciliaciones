import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsDeletedToWorkflowStages1786000000000 implements MigrationInterface {
    name = 'AddIsDeletedToWorkflowStages1786000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "DynamicWorkflowStages" ADD "IsDeleted" bit NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "DynamicWorkflowStages" DROP COLUMN "IsDeleted"`);
    }
}
