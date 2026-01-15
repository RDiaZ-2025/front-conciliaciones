import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProductionTablesAndRefactorProductionInfo1768496000000 implements MigrationInterface {
    name = 'CreateProductionTablesAndRefactorProductionInfo1768496000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create FormatTypes table
        await queryRunner.query(`CREATE TABLE "FormatTypes" ("Id" int NOT NULL IDENTITY(1,1), "Name" nvarchar(100) NOT NULL, CONSTRAINT "PK_FormatTypes" PRIMARY KEY ("Id"))`);
        
        // 2. Create RightsDurations table
        await queryRunner.query(`CREATE TABLE "RightsDurations" ("Id" int NOT NULL IDENTITY(1,1), "Name" nvarchar(100) NOT NULL, CONSTRAINT "PK_RightsDurations" PRIMARY KEY ("Id"))`);
        
        // 3. Insert default values for FormatTypes
        await queryRunner.query(`INSERT INTO "FormatTypes" ("Name") VALUES ('Producción TV'), ('Producción Digital')`);
        
        // 4. Insert default values for RightsDurations
        await queryRunner.query(`INSERT INTO "RightsDurations" ("Name") VALUES ('1 mes'), ('3 meses'), ('6 meses'), ('1 año')`);
        
        // 5. Alter ProductionInfo table
        // Add new columns
        await queryRunner.query(`ALTER TABLE "ProductionInfo" ADD "FormatTypeId" int`);
        await queryRunner.query(`ALTER TABLE "ProductionInfo" ADD "RightsDurationId" int`);
        
        // Add Foreign Keys
        await queryRunner.query(`ALTER TABLE "ProductionInfo" ADD CONSTRAINT "FK_ProductionInfo_FormatType" FOREIGN KEY ("FormatTypeId") REFERENCES "FormatTypes"("Id")`);
        await queryRunner.query(`ALTER TABLE "ProductionInfo" ADD CONSTRAINT "FK_ProductionInfo_RightsDuration" FOREIGN KEY ("RightsDurationId") REFERENCES "RightsDurations"("Id")`);
        
        // Drop old columns
        await queryRunner.query(`ALTER TABLE "ProductionInfo" DROP COLUMN "FormatType"`);
        await queryRunner.query(`ALTER TABLE "ProductionInfo" DROP COLUMN "RightsTime"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Restore old columns
        await queryRunner.query(`ALTER TABLE "ProductionInfo" ADD "RightsTime" nvarchar(255)`);
        await queryRunner.query(`ALTER TABLE "ProductionInfo" ADD "FormatType" nvarchar(255)`);
        
        // Drop FKs
        await queryRunner.query(`ALTER TABLE "ProductionInfo" DROP CONSTRAINT "FK_ProductionInfo_RightsDuration"`);
        await queryRunner.query(`ALTER TABLE "ProductionInfo" DROP CONSTRAINT "FK_ProductionInfo_FormatType"`);
        
        // Drop new columns
        await queryRunner.query(`ALTER TABLE "ProductionInfo" DROP COLUMN "RightsDurationId"`);
        await queryRunner.query(`ALTER TABLE "ProductionInfo" DROP COLUMN "FormatTypeId"`);
        
        // Drop tables
        await queryRunner.query(`DROP TABLE "RightsDurations"`);
        await queryRunner.query(`DROP TABLE "FormatTypes"`);
    }
}
