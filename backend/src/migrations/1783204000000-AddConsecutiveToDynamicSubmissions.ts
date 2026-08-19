import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConsecutiveToDynamicSubmissions1783204000000 implements MigrationInterface {
    name = 'AddConsecutiveToDynamicSubmissions1783204000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "DynamicFormSubmissions" ADD "Consecutive" nvarchar(100) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "DynamicFormSubmissions" DROP COLUMN "Consecutive"`);
    }
}
