import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedCustomersMenuItem1789000000000 implements MigrationInterface {
    name = 'SeedCustomersMenuItem1789000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO "MenuItems" ("Label", "Icon", "Route", "ParentId", "DisplayOrder", "IsActive", "PermissionId")
            VALUES ('Clientes', 'pi pi-users', '/customers', 7, 10, 1, NULL)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM "MenuItems" WHERE "Route" = '/customers'
        `);
    }
}
