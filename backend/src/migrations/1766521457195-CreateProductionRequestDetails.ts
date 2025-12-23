import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProductionRequestDetails1766521457195 implements MigrationInterface {
    name = 'CreateProductionRequestDetails1766521457195'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "CustomerData" ("Id" int NOT NULL IDENTITY(1,1), "ProductionRequestId" int NOT NULL, "RequestDate" datetime, "DeliveryDate" datetime, "ClientAgency" nvarchar(255), "RequesterName" nvarchar(255), "RequesterEmail" nvarchar(255), "RequesterPhone" nvarchar(50), "BusinessName" nvarchar(255), "NIT" nvarchar(50), "ServiceStrategy" bit NOT NULL CONSTRAINT "DF_f6ceafe5f76e31262303595cedc" DEFAULT 0, "ServiceTactical" bit NOT NULL CONSTRAINT "DF_5418c54267a3739948d846b83fe" DEFAULT 0, "ServiceProduction" bit NOT NULL CONSTRAINT "DF_5e76de8383e28acc7523abcf905" DEFAULT 0, "ServiceData" bit NOT NULL CONSTRAINT "DF_f34f6486560330980ebf6e90782" DEFAULT 0, CONSTRAINT "UQ_277577dbf3a786c3c891f6131c8" UNIQUE ("ProductionRequestId"), CONSTRAINT "PK_91d9ad157b2939fd9e454befc58" PRIMARY KEY ("Id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "REL_277577dbf3a786c3c891f6131c" ON "CustomerData" ("ProductionRequestId") WHERE "ProductionRequestId" IS NOT NULL`);
        await queryRunner.query(`CREATE TABLE "CampaignDetails" ("Id" int NOT NULL IDENTITY(1,1), "ProductionRequestId" int NOT NULL, "Budget" nvarchar(100), "Brand" nvarchar(255), "ProductService" nvarchar(255), "Objective" nvarchar(255), "Product1Name" nvarchar(255), "Product1Quantity" nvarchar(50), "Product2Name" nvarchar(255), "Product2Quantity" nvarchar(50), "Product3Name" nvarchar(255), "Product3Quantity" nvarchar(50), "Product4Name" nvarchar(255), "Product4Quantity" nvarchar(50), CONSTRAINT "UQ_56a60c294a03459d2f91d5088f7" UNIQUE ("ProductionRequestId"), CONSTRAINT "PK_435385ce0261f6ebd39ef778eac" PRIMARY KEY ("Id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "REL_56a60c294a03459d2f91d5088f" ON "CampaignDetails" ("ProductionRequestId") WHERE "ProductionRequestId" IS NOT NULL`);
        await queryRunner.query(`CREATE TABLE "AudienceData" ("Id" int NOT NULL IDENTITY(1,1), "ProductionRequestId" int NOT NULL, "Gender" nvarchar(100), "Geo" nvarchar(255), "AgeRange" nvarchar(100), "SocioEconomicLevel" nvarchar(100), "Interests" nvarchar(MAX), "SpecificDetails" nvarchar(MAX), "CampaignContext" nvarchar(MAX), "CampaignConcept" nvarchar(MAX), "Assets" nvarchar(MAX), CONSTRAINT "UQ_f5ad8f8d54ccb8ebe83da6aa1e3" UNIQUE ("ProductionRequestId"), CONSTRAINT "PK_dfbc64ec4f5278a8c12dabc91fc" PRIMARY KEY ("Id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "REL_f5ad8f8d54ccb8ebe83da6aa1e" ON "AudienceData" ("ProductionRequestId") WHERE "ProductionRequestId" IS NOT NULL`);
        await queryRunner.query(`CREATE TABLE "ProductionInfo" ("Id" int NOT NULL IDENTITY(1,1), "ProductionRequestId" int NOT NULL, "FormatType" nvarchar(255), "RightsTime" nvarchar(255), "CampaignEmissionDate" datetime, "CommunicationTone" nvarchar(255), "OwnAndExternalMedia" nvarchar(MAX), "TvFormats" nvarchar(MAX), "DigitalFormats" nvarchar(MAX), "ProductionDetails" nvarchar(MAX), "AdditionalComments" nvarchar(MAX), CONSTRAINT "UQ_928d14f982571a2c5d56aad3e84" UNIQUE ("ProductionRequestId"), CONSTRAINT "PK_76b41a7df557b2f809c48536b5e" PRIMARY KEY ("Id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "REL_928d14f982571a2c5d56aad3e8" ON "ProductionInfo" ("ProductionRequestId") WHERE "ProductionRequestId" IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "CustomerData" ADD CONSTRAINT "FK_277577dbf3a786c3c891f6131c8" FOREIGN KEY ("ProductionRequestId") REFERENCES "ProductionRequests"("Id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "CampaignDetails" ADD CONSTRAINT "FK_56a60c294a03459d2f91d5088f7" FOREIGN KEY ("ProductionRequestId") REFERENCES "ProductionRequests"("Id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "AudienceData" ADD CONSTRAINT "FK_f5ad8f8d54ccb8ebe83da6aa1e3" FOREIGN KEY ("ProductionRequestId") REFERENCES "ProductionRequests"("Id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ProductionInfo" ADD CONSTRAINT "FK_928d14f982571a2c5d56aad3e84" FOREIGN KEY ("ProductionRequestId") REFERENCES "ProductionRequests"("Id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ProductionInfo" DROP CONSTRAINT "FK_928d14f982571a2c5d56aad3e84"`);
        await queryRunner.query(`ALTER TABLE "AudienceData" DROP CONSTRAINT "FK_f5ad8f8d54ccb8ebe83da6aa1e3"`);
        await queryRunner.query(`ALTER TABLE "CampaignDetails" DROP CONSTRAINT "FK_56a60c294a03459d2f91d5088f7"`);
        await queryRunner.query(`ALTER TABLE "CustomerData" DROP CONSTRAINT "FK_277577dbf3a786c3c891f6131c8"`);
        await queryRunner.query(`DROP INDEX "REL_928d14f982571a2c5d56aad3e8" ON "ProductionInfo"`);
        await queryRunner.query(`DROP TABLE "ProductionInfo"`);
        await queryRunner.query(`DROP INDEX "REL_f5ad8f8d54ccb8ebe83da6aa1e" ON "AudienceData"`);
        await queryRunner.query(`DROP TABLE "AudienceData"`);
        await queryRunner.query(`DROP INDEX "REL_56a60c294a03459d2f91d5088f" ON "CampaignDetails"`);
        await queryRunner.query(`DROP TABLE "CampaignDetails"`);
        await queryRunner.query(`DROP INDEX "REL_277577dbf3a786c3c891f6131c" ON "CustomerData"`);
        await queryRunner.query(`DROP TABLE "CustomerData"`);
    }

}
