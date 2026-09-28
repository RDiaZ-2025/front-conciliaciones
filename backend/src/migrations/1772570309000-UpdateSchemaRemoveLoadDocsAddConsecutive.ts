import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class UpdateSchemaRemoveLoadDocsAddConsecutive1772570309000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        const table = await queryRunner.getTable("LoadDocumentsOcByUser");
        if (table) {
            await queryRunner.dropTable("LoadDocumentsOcByUser", true);
        }

        const productionRequestsTable = await queryRunner.getTable("ProductionRequests");
        if (productionRequestsTable) {
            const consecutiveColumn = productionRequestsTable.findColumnByName("Consecutive");
            if (!consecutiveColumn) {
                await queryRunner.addColumn("ProductionRequests", new TableColumn({
                    name: "Consecutive",
                    type: "int",
                    isNullable: true,
                    isGenerated: false
                }));
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

        const productionRequestsTable = await queryRunner.getTable("ProductionRequests");
        if (productionRequestsTable) {
            const consecutiveColumn = productionRequestsTable.findColumnByName("Consecutive");
            if (consecutiveColumn) {
                await queryRunner.dropColumn("ProductionRequests", "Consecutive");
            }
        }

        await queryRunner.query(`
            CREATE TABLE "LoadDocumentsOcByUser" (
                "Id" int NOT NULL IDENTITY(1,1),
                "IdUser" int NOT NULL,
                "IdFolder" uniqueidentifier NOT NULL,
                "Fecha" datetime NOT NULL DEFAULT getdate(),
                "Status" varchar(50),
                "FileName" varchar(255) NOT NULL,
                CONSTRAINT "PK_LoadDocumentsOcByUser" PRIMARY KEY ("Id")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "LoadDocumentsOcByUser"
            ADD CONSTRAINT "FK_LoadDocumentsOcByUser_User"
            FOREIGN KEY ("IdUser") REFERENCES "Users" ("Id")
        `);
    }

}
