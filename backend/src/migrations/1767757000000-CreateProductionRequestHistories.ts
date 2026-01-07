import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateProductionRequestHistories1767757000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "ProductionRequestHistories",
            columns: [
                {
                    name: "Id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "ProductionRequestId",
                    type: "int",
                    isNullable: false
                },
                {
                    name: "ChangeField",
                    type: "nvarchar",
                    length: "255",
                    isNullable: false
                },
                {
                    name: "OldValue",
                    type: "nvarchar",
                    length: "MAX",
                    isNullable: true
                },
                {
                    name: "NewValue",
                    type: "nvarchar",
                    length: "MAX",
                    isNullable: true
                },
                {
                    name: "ChangedBy",
                    type: "int",
                    isNullable: false
                },
                {
                    name: "ChangeType",
                    type: "nvarchar",
                    length: "50",
                    isNullable: false
                },
                {
                    name: "CreatedAt",
                    type: "datetime",
                    default: "GETDATE()"
                }
            ]
        }), true);

        await queryRunner.createForeignKey("ProductionRequestHistories", new TableForeignKey({
            columnNames: ["ProductionRequestId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "ProductionRequests",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("ProductionRequestHistories", new TableForeignKey({
            columnNames: ["ChangedBy"],
            referencedColumnNames: ["Id"],
            referencedTableName: "Users",
            onDelete: "NO ACTION"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("ProductionRequestHistories");
        const foreignKeyRequest = table!.foreignKeys.find(fk => fk.columnNames.indexOf("ProductionRequestId") !== -1);
        const foreignKeyUser = table!.foreignKeys.find(fk => fk.columnNames.indexOf("ChangedBy") !== -1);
        
        if (foreignKeyRequest) await queryRunner.dropForeignKey("ProductionRequestHistories", foreignKeyRequest);
        if (foreignKeyUser) await queryRunner.dropForeignKey("ProductionRequestHistories", foreignKeyUser);
        
        await queryRunner.dropTable("ProductionRequestHistories");
    }
}
