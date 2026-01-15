import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBossToUser1768519800000 implements MigrationInterface {
    name = 'AddBossToUser1768519800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Users" ADD "BossId" int`);
        await queryRunner.query(`ALTER TABLE "Users" ADD CONSTRAINT "FK_Users_Boss" FOREIGN KEY ("BossId") REFERENCES "Users"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Users" DROP CONSTRAINT "FK_Users_Boss"`);
        await queryRunner.query(`ALTER TABLE "Users" DROP COLUMN "BossId"`);
    }
}
