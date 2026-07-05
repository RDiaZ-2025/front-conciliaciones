import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIconToDynamicForms1783205000000 implements MigrationInterface {
    name = 'AddIconToDynamicForms1783205000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "DynamicForms" ADD "Icon" nvarchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "DynamicForms" DROP COLUMN "Icon"`);
    }
}
