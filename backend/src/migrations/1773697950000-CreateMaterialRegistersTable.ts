import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateMaterialRegistersTable1773697950000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "MaterialRegisters",
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
                    name: "Category",
                    type: "nvarchar",
                    length: "100",
                    isNullable: false
                },
                {
                    name: "Type",
                    type: "nvarchar",
                    length: "100",
                    isNullable: false
                },
                {
                    name: "Solution",
                    type: "nvarchar",
                    length: "100",
                    isNullable: false
                },
                {
                    name: "JsonRequest",
                    type: "nvarchar",
                    length: "MAX",
                    isNullable: false
                },
                {
                    name: "CreatedAt",
                    type: "datetime",
                    default: "GETDATE()",
                    isNullable: false
                },
                {
                    name: "CreatedBy",
                    type: "int",
                    isNullable: false
                }
            ]
        }), true);

        await queryRunner.createForeignKey("MaterialRegisters", new TableForeignKey({
            columnNames: ["ProductionRequestId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "ProductionRequests",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("MaterialRegisters", new TableForeignKey({
            columnNames: ["CreatedBy"],
            referencedColumnNames: ["Id"],
            referencedTableName: "Users",
            onDelete: "NO ACTION" // Or CASCADE depending on requirement, usually user deletion shouldn't delete logs/registers
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("MaterialRegisters");
        const foreignKeyRequest = table!.foreignKeys.find(fk => fk.columnNames.indexOf("ProductionRequestId") !== -1);
        const foreignKeyUser = table!.foreignKeys.find(fk => fk.columnNames.indexOf("CreatedBy") !== -1);
        
        if (foreignKeyRequest) await queryRunner.dropForeignKey("MaterialRegisters", foreignKeyRequest);
        if (foreignKeyUser) await queryRunner.dropForeignKey("MaterialRegisters", foreignKeyUser);
        
        await queryRunner.dropTable("MaterialRegisters");
    }
}
