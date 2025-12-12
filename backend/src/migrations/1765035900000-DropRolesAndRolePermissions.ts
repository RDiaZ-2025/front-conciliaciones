import { MigrationInterface, QueryRunner } from "typeorm";

export class DropRolesAndRolePermissions1765035900000 implements MigrationInterface {
    name = 'DropRolesAndRolePermissions1765035900000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First drop foreign keys from Users table if they exist
        const table = await queryRunner.getTable("Users");
        const foreignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf("RoleId") !== -1);
        if (foreignKey) {
            await queryRunner.dropForeignKey("Users", foreignKey);
        }

        // Drop RoleId column from Users
        if (table?.columns.find(c => c.name === "RoleId")) {
            await queryRunner.dropColumn("Users", "RoleId");
        }

        // Drop RolePermissions table
        await queryRunner.dropTable("RolePermissions", true);

        // Drop Roles table
        await queryRunner.dropTable("Roles", true);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Since this is a destructive operation requested by the user to "delete" the tables,
        // we do not implement the down method to recreate them as per standard practice
        // when permanently removing features. If we wanted to be safe, we would need
        // to recreate the tables here.
    }
}
