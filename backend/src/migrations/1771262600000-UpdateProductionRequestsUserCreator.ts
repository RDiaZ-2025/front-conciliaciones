import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class UpdateProductionRequestsUserCreator1771262600000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Add UserCreatorId column
        await queryRunner.addColumn("ProductionRequests", new TableColumn({
            name: "UserCreatorId",
            type: "int",
            isNullable: true
        }));

        // 2. Add Foreign Key
        await queryRunner.createForeignKey("ProductionRequests", new TableForeignKey({
            columnNames: ["UserCreatorId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "Users",
            onDelete: "NO ACTION"
        }));

        // 3. Drop ContactPerson column
        await queryRunner.dropColumn("ProductionRequests", "ContactPerson");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 1. Add ContactPerson back
        await queryRunner.addColumn("ProductionRequests", new TableColumn({
            name: "ContactPerson",
            type: "nvarchar",
            length: "255",
            isNullable: true
        }));

        // 2. Drop Foreign Key
        const table = await queryRunner.getTable("ProductionRequests");
        const foreignKey = table!.foreignKeys.find(fk => fk.columnNames.indexOf("UserCreatorId") !== -1);
        if (foreignKey) {
            await queryRunner.dropForeignKey("ProductionRequests", foreignKey);
        }

        // 3. Drop UserCreatorId
        await queryRunner.dropColumn("ProductionRequests", "UserCreatorId");
    }

}
