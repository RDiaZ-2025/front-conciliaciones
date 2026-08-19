import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsActiveToDynamicFormFields1783301000000 implements MigrationInterface {
    name = 'AddIsActiveToDynamicFormFields1783301000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "DynamicFormFields" ADD "IsActive" bit NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "DynamicFormFields" DROP COLUMN "IsActive"`);
    }
}
