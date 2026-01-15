import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAudienceTablesAndRefactorAudienceData1768493000000 implements MigrationInterface {
    name = 'CreateAudienceTablesAndRefactorAudienceData1768493000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create Gender table
        await queryRunner.query(`CREATE TABLE "Genders" ("Id" int NOT NULL IDENTITY(1,1), "Name" nvarchar(100) NOT NULL, CONSTRAINT "PK_Genders" PRIMARY KEY ("Id"))`);
        
        // 2. Create AgeRange table
        await queryRunner.query(`CREATE TABLE "AgeRanges" ("Id" int NOT NULL IDENTITY(1,1), "Name" nvarchar(100) NOT NULL, CONSTRAINT "PK_AgeRanges" PRIMARY KEY ("Id"))`);
        
        // 3. Create SocioeconomicLevel table
        await queryRunner.query(`CREATE TABLE "SocioeconomicLevels" ("Id" int NOT NULL IDENTITY(1,1), "Name" nvarchar(100) NOT NULL, CONSTRAINT "PK_SocioeconomicLevels" PRIMARY KEY ("Id"))`);

        // 4. Insert default values
        await queryRunner.query(`INSERT INTO "Genders" ("Name") VALUES ('Male'), ('Female'), ('People')`);
        await queryRunner.query(`INSERT INTO "AgeRanges" ("Name") VALUES ('18+'), ('18–24'), ('25–34'), ('35–44'), ('45–55'), ('55+')`);
        await queryRunner.query(`INSERT INTO "SocioeconomicLevels" ("Name") VALUES ('Low (1–2)'), ('Medium (3–4)'), ('High (5–6)'), ('All')`);

        // 5. Alter AudienceData table
        // Add new columns
        await queryRunner.query(`ALTER TABLE "AudienceData" ADD "GenderId" int`);
        await queryRunner.query(`ALTER TABLE "AudienceData" ADD "AgeRangeId" int`);
        await queryRunner.query(`ALTER TABLE "AudienceData" ADD "SocioEconomicLevelId" int`);

        // Add Foreign Keys
        await queryRunner.query(`ALTER TABLE "AudienceData" ADD CONSTRAINT "FK_AudienceData_Gender" FOREIGN KEY ("GenderId") REFERENCES "Genders"("Id")`);
        await queryRunner.query(`ALTER TABLE "AudienceData" ADD CONSTRAINT "FK_AudienceData_AgeRange" FOREIGN KEY ("AgeRangeId") REFERENCES "AgeRanges"("Id")`);
        await queryRunner.query(`ALTER TABLE "AudienceData" ADD CONSTRAINT "FK_AudienceData_SocioeconomicLevel" FOREIGN KEY ("SocioEconomicLevelId") REFERENCES "SocioeconomicLevels"("Id")`);

        // Drop old columns
        // Check if columns exist before dropping to avoid errors if run multiple times (though TypeORM migrations usually run once)
        // But for standard SQL Server migration syntax:
        await queryRunner.query(`ALTER TABLE "AudienceData" DROP COLUMN "Gender"`);
        await queryRunner.query(`ALTER TABLE "AudienceData" DROP COLUMN "AgeRange"`);
        await queryRunner.query(`ALTER TABLE "AudienceData" DROP COLUMN "SocioEconomicLevel"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Restore old columns
        await queryRunner.query(`ALTER TABLE "AudienceData" ADD "SocioEconomicLevel" nvarchar(100)`);
        await queryRunner.query(`ALTER TABLE "AudienceData" ADD "AgeRange" nvarchar(100)`);
        await queryRunner.query(`ALTER TABLE "AudienceData" ADD "Gender" nvarchar(100)`);

        // Drop FKs
        await queryRunner.query(`ALTER TABLE "AudienceData" DROP CONSTRAINT "FK_AudienceData_SocioeconomicLevel"`);
        await queryRunner.query(`ALTER TABLE "AudienceData" DROP CONSTRAINT "FK_AudienceData_AgeRange"`);
        await queryRunner.query(`ALTER TABLE "AudienceData" DROP CONSTRAINT "FK_AudienceData_Gender"`);

        // Drop new columns
        await queryRunner.query(`ALTER TABLE "AudienceData" DROP COLUMN "SocioEconomicLevelId"`);
        await queryRunner.query(`ALTER TABLE "AudienceData" DROP COLUMN "AgeRangeId"`);
        await queryRunner.query(`ALTER TABLE "AudienceData" DROP COLUMN "GenderId"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "SocioeconomicLevels"`);
        await queryRunner.query(`DROP TABLE "AgeRanges"`);
        await queryRunner.query(`DROP TABLE "Genders"`);
    }
}
