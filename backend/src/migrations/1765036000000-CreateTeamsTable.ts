import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTeamsTable1765036000000 implements MigrationInterface {
    name = 'CreateTeamsTable1765036000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "Teams" ("Id" int NOT NULL IDENTITY(1,1), "Name" nvarchar(255) NOT NULL, "Description" nvarchar(500), CONSTRAINT "PK_Teams" PRIMARY KEY ("Id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "Teams"`);
    }

}
