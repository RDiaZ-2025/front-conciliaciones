import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMaterialDataColumn1771278345000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if column exists before adding to avoid errors
        const colExists = await queryRunner.query(`
            SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'ProductionRequests' 
            AND COLUMN_NAME = 'MaterialData'
        `);

        if (colExists.length === 0) {
            await queryRunner.query(`ALTER TABLE ProductionRequests ADD MaterialData NVARCHAR(MAX) NULL`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const colExists = await queryRunner.query(`
            SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'ProductionRequests' 
            AND COLUMN_NAME = 'MaterialData'
        `);

        if (colExists.length > 0) {
            await queryRunner.query(`ALTER TABLE ProductionRequests DROP COLUMN MaterialData`);
        }
    }

}
