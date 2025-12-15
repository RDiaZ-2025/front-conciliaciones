import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class AddAssignedUserToProductionRequest1765814000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("ProductionRequests", new TableColumn({
            name: "AssignedUserId",
            type: "int",
            isNullable: true
        }));

        await queryRunner.createForeignKey("ProductionRequests", new TableForeignKey({
            columnNames: ["AssignedUserId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "Users",
            onDelete: "SET NULL"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("ProductionRequests");
        if (table) {
            const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf("AssignedUserId") !== -1);
            if (foreignKey) {
                await queryRunner.dropForeignKey("ProductionRequests", foreignKey);
            }
        }
        await queryRunner.dropColumn("ProductionRequests", "AssignedUserId");
    }

}
