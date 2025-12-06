import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class AddPermissionToMenuItem1765031500000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("MenuItems", new TableColumn({
            name: "PermissionId",
            type: "int",
            isNullable: true
        }));

        await queryRunner.createForeignKey("MenuItems", new TableForeignKey({
            columnNames: ["PermissionId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "Permissions",
            onDelete: "SET NULL"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("MenuItems");
        const foreignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf("PermissionId") !== -1);
        if (foreignKey) {
            await queryRunner.dropForeignKey("MenuItems", foreignKey);
        }
        await queryRunner.dropColumn("MenuItems", "PermissionId");
    }
}
