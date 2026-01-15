import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAudienceValuesToSpanish1768494000000 implements MigrationInterface {
    name = 'UpdateAudienceValuesToSpanish1768494000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update Genders
        await queryRunner.query(`UPDATE "Genders" SET "Name" = 'Hombres' WHERE "Name" = 'Male'`);
        await queryRunner.query(`UPDATE "Genders" SET "Name" = 'Mujeres' WHERE "Name" = 'Female'`);
        await queryRunner.query(`UPDATE "Genders" SET "Name" = 'Ambos' WHERE "Name" = 'People'`);

        // Update SocioeconomicLevels
        await queryRunner.query(`UPDATE "SocioeconomicLevels" SET "Name" = 'Bajo (1–2)' WHERE "Name" = 'Low (1–2)'`);
        await queryRunner.query(`UPDATE "SocioeconomicLevels" SET "Name" = 'Medio (3–4)' WHERE "Name" = 'Medium (3–4)'`);
        await queryRunner.query(`UPDATE "SocioeconomicLevels" SET "Name" = 'Alto (5–6)' WHERE "Name" = 'High (5–6)'`);
        await queryRunner.query(`UPDATE "SocioeconomicLevels" SET "Name" = 'Todos' WHERE "Name" = 'All'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert Genders
        await queryRunner.query(`UPDATE "Genders" SET "Name" = 'Male' WHERE "Name" = 'Hombres'`);
        await queryRunner.query(`UPDATE "Genders" SET "Name" = 'Female' WHERE "Name" = 'Mujeres'`);
        await queryRunner.query(`UPDATE "Genders" SET "Name" = 'People' WHERE "Name" = 'Ambos'`);

        // Revert SocioeconomicLevels
        await queryRunner.query(`UPDATE "SocioeconomicLevels" SET "Name" = 'Low (1–2)' WHERE "Name" = 'Bajo (1–2)'`);
        await queryRunner.query(`UPDATE "SocioeconomicLevels" SET "Name" = 'Medium (3–4)' WHERE "Name" = 'Medio (3–4)'`);
        await queryRunner.query(`UPDATE "SocioeconomicLevels" SET "Name" = 'High (5–6)' WHERE "Name" = 'Alto (5–6)'`);
        await queryRunner.query(`UPDATE "SocioeconomicLevels" SET "Name" = 'All' WHERE "Name" = 'Todos'`);
    }
}
