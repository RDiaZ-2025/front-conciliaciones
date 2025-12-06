import { MigrationInterface, QueryRunner } from "typeorm";

export class DropRolesAndRolePermissions1765035900000 implements MigrationInterface {
    name = 'DropRolesAndRolePermissions1765035900000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First drop foreign keys from Users table if they exist
        const table = await queryRunner.getTable("users");
        const foreignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf("roleId") !== -1);
        if (foreignKey) {
            await queryRunner.dropForeignKey("users", foreignKey);
        }

        // Drop roleId column from users
        if (table?.columns.find(c => c.name === "roleId")) {
            await queryRunner.dropColumn("users", "roleId");
        }

        // Drop RolePermissions table
        await queryRunner.dropTable("role_permissions", true);

        // Drop Roles table
        await queryRunner.dropTable("roles", true);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Since this is a destructive operation requested by the user to "delete" the tables,
        // we do not implement the down method to recreate them as per standard practice
        // when permanently removing features. If we wanted to be safe, we would need
        // to recreate the tables here.
    }
}
