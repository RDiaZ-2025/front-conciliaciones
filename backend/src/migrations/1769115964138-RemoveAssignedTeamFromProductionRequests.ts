import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveAssignedTeamFromProductionRequests1769115964138 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ProductionRequests" DROP COLUMN "AssignedTeam"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ProductionRequests" ADD "AssignedTeam" nvarchar(255) NOT NULL DEFAULT ''`);
    }

}
