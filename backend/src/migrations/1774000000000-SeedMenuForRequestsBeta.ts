import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedMenuForRequestsBeta1774000000000 implements MigrationInterface {
    name = 'SeedMenuForRequestsBeta1774000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Insert menu items for Approvals Inbox and Admin panel under parent 13 (Comercial)
        await queryRunner.query(`
            INSERT INTO "MenuItems" ("Label", "Icon", "Route", "ParentId", "DisplayOrder", "IsActive", "PermissionId") VALUES
            ('Aprobaciones (Beta)', 'pi pi-inbox', '/requests-beta/inbox', 13, 21, 1, NULL),
            ('Admin Formularios (Beta)', 'pi pi-sliders-h', '/requests-beta/admin', 13, 22, 1, NULL);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM "MenuItems" WHERE "Route" IN ('/requests-beta/inbox', '/requests-beta/admin');
        `);
    }
}
