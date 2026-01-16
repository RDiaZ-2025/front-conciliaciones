import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRequestsReportRoute1768600000000 implements MigrationInterface {
    name = 'AddRequestsReportRoute1768600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "MenuItems" SET "Route" = '/requests-report' WHERE "Label" = 'InformeSolicitudes'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "MenuItems" SET "Route" = NULL WHERE "Label" = 'InformeSolicitudes'`);
    }
}
