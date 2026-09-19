import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveBetaFromRequestsMenuItems1802000000000 implements MigrationInterface {
    name = 'RemoveBetaFromRequestsMenuItems1802000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "MenuItems" 
            SET "Label" = 'Producción' 
            WHERE "Route" = '/requests-beta';
        `);

        await queryRunner.query(`
            UPDATE "MenuItems" 
            SET "Label" = 'Aprobaciones' 
            WHERE "Route" = '/requests-beta/inbox';
        `);

        await queryRunner.query(`
            UPDATE "MenuItems" 
            SET "Label" = 'Admin Formularios' 
            WHERE "Route" = '/requests-beta/admin';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "MenuItems" 
            SET "Label" = 'Producción BETA' 
            WHERE "Route" = '/requests-beta';
        `);

        await queryRunner.query(`
            UPDATE "MenuItems" 
            SET "Label" = 'Aprobaciones (Beta)' 
            WHERE "Route" = '/requests-beta/inbox';
        `);

        await queryRunner.query(`
            UPDATE "MenuItems" 
            SET "Label" = 'Admin Formularios (Beta)' 
            WHERE "Route" = '/requests-beta/admin';
        `);
    }
}
