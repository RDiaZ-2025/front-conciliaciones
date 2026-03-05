import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddUnitAssignedToProductionRequests1772750597506 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            "ProductionRequests",
            new TableColumn({
                name: "UnitAssigned",
                type: "nvarchar",
                length: "255",
                isNullable: true
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("ProductionRequests", "UnitAssigned");
    }

}
