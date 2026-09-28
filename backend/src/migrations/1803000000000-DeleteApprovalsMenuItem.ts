import { MigrationInterface, QueryRunner } from "typeorm";

export class DeleteApprovalsMenuItem1803000000000 implements MigrationInterface {
    name = 'DeleteApprovalsMenuItem1803000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM "MenuItems" 
            WHERE "Route" = '/requests-beta/inbox';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO "MenuItems" ("Label", "Icon", "Route", "ParentId", "DisplayOrder", "IsActive", "PermissionId") 
            VALUES ('Aprobaciones', 'pi pi-inbox', '/requests-beta/inbox', 13, 21, 1, NULL);
        `);
    }
}
