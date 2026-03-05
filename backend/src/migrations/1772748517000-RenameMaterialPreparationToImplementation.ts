import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameMaterialPreparationToImplementation1772748517000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "ProductionRequests" SET "Status" = 'implementation' WHERE "Status" = 'material_preparation'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "ProductionRequests" SET "Status" = 'material_preparation' WHERE "Status" = 'implementation'`);
    }

}
