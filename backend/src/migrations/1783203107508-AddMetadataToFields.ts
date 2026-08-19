import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMetadataToFields1783203107508 implements MigrationInterface {
    name = 'AddMetadataToFields1783203107508'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "DynamicFormFields" ADD "Metadata" nvarchar(max)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "DynamicFormFields" DROP COLUMN "Metadata"`);
    }
}
