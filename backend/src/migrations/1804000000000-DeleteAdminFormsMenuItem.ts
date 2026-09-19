import { MigrationInterface, QueryRunner } from "typeorm";

export class DeleteAdminFormsMenuItem1804000000000 implements MigrationInterface {
    name = 'DeleteAdminFormsMenuItem1804000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM "MenuItems" 
            WHERE "Route" = '/requests-beta/admin';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO "MenuItems" ("Label", "Icon", "Route", "ParentId", "DisplayOrder", "IsActive", "PermissionId", "Project") 
            VALUES ('Admin Formularios', 'form', '/requests-beta/admin', 13, 22, 1, 32, 'voc');
        `);
    }
}
