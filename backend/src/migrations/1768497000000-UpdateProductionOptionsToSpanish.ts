import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateProductionOptionsToSpanish1768497000000 implements MigrationInterface {
    name = 'UpdateProductionOptionsToSpanish1768497000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update FormatTypes
        // We handle both English (if existed) and Spanish (normalization) cases
        
        // TV Production / Producción TV -> Producción de TV
        await queryRunner.query(`UPDATE "FormatTypes" SET "Name" = 'Producción de TV' WHERE "Name" IN ('TV Production', 'Producción TV')`);
        
        // Digital Production -> Producción Digital
        await queryRunner.query(`UPDATE "FormatTypes" SET "Name" = 'Producción Digital' WHERE "Name" = 'Digital Production'`);
        
        // Update RightsDurations
        // 1 month -> 1 mes
        await queryRunner.query(`UPDATE "RightsDurations" SET "Name" = '1 mes' WHERE "Name" = '1 month'`);
        
        // 3 months -> 3 meses
        await queryRunner.query(`UPDATE "RightsDurations" SET "Name" = '3 meses' WHERE "Name" = '3 months'`);
        
        // 6 months -> 6 meses
        await queryRunner.query(`UPDATE "RightsDurations" SET "Name" = '6 meses' WHERE "Name" = '6 months'`);
        
        // 1 year -> 1 año
        await queryRunner.query(`UPDATE "RightsDurations" SET "Name" = '1 año' WHERE "Name" = '1 year'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert to English (optional, but good practice)
        await queryRunner.query(`UPDATE "FormatTypes" SET "Name" = 'TV Production' WHERE "Name" = 'Producción de TV'`);
        await queryRunner.query(`UPDATE "RightsDurations" SET "Name" = '1 month' WHERE "Name" = '1 mes'`);
        await queryRunner.query(`UPDATE "RightsDurations" SET "Name" = '3 months' WHERE "Name" = '3 meses'`);
        await queryRunner.query(`UPDATE "RightsDurations" SET "Name" = '6 months' WHERE "Name" = '6 meses'`);
        await queryRunner.query(`UPDATE "RightsDurations" SET "Name" = '1 year' WHERE "Name" = '1 año'`);
    }
}
