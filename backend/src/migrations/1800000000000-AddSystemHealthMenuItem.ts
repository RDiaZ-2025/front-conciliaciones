import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSystemHealthMenuItem1800000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Buscar el id del permiso health_checker
        const permissions = await queryRunner.query(
            `SELECT Id FROM Permissions WHERE Name = 'health_checker'`
        );
        const permissionId = permissions && permissions.length > 0 ? permissions[0].Id : null;

        // Verificar si existe el menú padre Administración (Id 7)
        const parent = await queryRunner.query(
            `SELECT Id FROM MenuItems WHERE Id = 7`
        );
        const parentId = parent && parent.length > 0 ? 7 : null;

        // Verificar si ya existe el ítem de menú
        const existing = await queryRunner.query(
            `SELECT * FROM MenuItems WHERE Route = '/system-health'`
        );

        if (!existing || existing.length === 0) {
            await queryRunner.query(
                `INSERT INTO MenuItems (Label, Icon, Route, ParentId, DisplayOrder, IsActive, PermissionId, Project)
                 VALUES ('Estado del Sistema', 'activity', '/system-health', ${parentId !== null ? parentId : 'NULL'}, 12, 1, ${permissionId !== null ? permissionId : 'NULL'}, 'voc')`
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM MenuItems WHERE Route = '/system-health'`
        );
    }

}
