import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDisplayOrderToDynamicForms1787000000000 implements MigrationInterface {
    name = 'AddDisplayOrderToDynamicForms1787000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "DynamicForms" ADD "DisplayOrder" int NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "DynamicForms" DROP COLUMN "DisplayOrder"`);
    }
}
