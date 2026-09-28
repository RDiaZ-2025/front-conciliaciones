import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class UpdateProductionRequestsUserCreator1771262600000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.addColumn("ProductionRequests", new TableColumn({
            name: "UserCreatorId",
            type: "int",
            isNullable: true
        }));

        await queryRunner.createForeignKey("ProductionRequests", new TableForeignKey({
            columnNames: ["UserCreatorId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "Users",
            onDelete: "NO ACTION"
        }));

        await queryRunner.dropColumn("ProductionRequests", "ContactPerson");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.addColumn("ProductionRequests", new TableColumn({
            name: "ContactPerson",
            type: "nvarchar",
            length: "255",
            isNullable: true
        }));

        const table = await queryRunner.getTable("ProductionRequests");
        const foreignKey = table!.foreignKeys.find(fk => fk.columnNames.indexOf("UserCreatorId") !== -1);
        if (foreignKey) {
            await queryRunner.dropForeignKey("ProductionRequests", foreignKey);
        }

        await queryRunner.dropColumn("ProductionRequests", "UserCreatorId");
    }

}
