import { MigrationInterface, QueryRunner } from "typeorm";

export class AddResponsibleAndRoleToDynamicForms1773970000000 implements MigrationInterface {
    name = 'AddResponsibleAndRoleToDynamicForms1773970000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "DynamicForms" ADD "Responsible" nvarchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE "DynamicForms" ADD "Role" nvarchar(255) NULL`);
        
        // Update the seeded values
        await queryRunner.query(`
            UPDATE DynamicForms SET Responsible = 'Luisa Fajardo', Role = 'Coordinadora de Preventa' WHERE Name = 'CONTENT MARKETING';
            UPDATE DynamicForms SET Responsible = 'Carlos Ospina', Role = 'Líder de Analytics' WHERE Name = 'DATA';
            UPDATE DynamicForms SET Responsible = 'Camila García', Role = 'Directora Creativa' WHERE Name = 'ESTRATEGIA Y PRODUCCIÓN';
            UPDATE DynamicForms SET Responsible = 'Daniel Castañeda', Role = 'Líder de Implementación' WHERE Name = 'IMPLEMENTACIÓN DE CAMPAÑAS';
            UPDATE DynamicForms SET Responsible = 'Maria Lopez', Role = 'Líder de Operaciones' WHERE Name = 'TRÁFICO CALIFICADO';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "DynamicForms" DROP COLUMN "Role"`);
        await queryRunner.query(`ALTER TABLE "DynamicForms" DROP COLUMN "Responsible"`);
    }
}
