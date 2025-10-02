import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1759422558719 implements MigrationInterface {
    name = 'InitialMigration1759422558719'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "Permissions" ("Id" int NOT NULL IDENTITY(1,1), "Name" varchar(255) NOT NULL, "Description" varchar(500), "CreatedAt" datetime NOT NULL CONSTRAINT "DF_61e5432cbbd5b90293faa041a4e" DEFAULT getdate(), CONSTRAINT "UQ_f685112ff526e2c420042c1368f" UNIQUE ("Name"), CONSTRAINT "PK_99fa50928aea3ac88937056e3dd" PRIMARY KEY ("Id"))`);
        await queryRunner.query(`CREATE TABLE "PermissionsByUser" ("Id" int NOT NULL IDENTITY(1,1), "UserId" int NOT NULL, "PermissionId" int NOT NULL, "AssignedAt" datetime NOT NULL CONSTRAINT "DF_683f38da63ac57f49e315168726" DEFAULT getdate(), CONSTRAINT "UQ_dd300d291e46a5fdc6c634714ce" UNIQUE ("UserId", "PermissionId"), CONSTRAINT "PK_8f8d088aa83746f7a91066bb0c9" PRIMARY KEY ("Id"))`);
        await queryRunner.query(`CREATE INDEX "IX_PermissionsByUser_UserId" ON "PermissionsByUser" ("UserId") `);
        await queryRunner.query(`CREATE TABLE "LoadDocumentsOcByUser" ("Id" int NOT NULL IDENTITY(1,1), "IdUser" int NOT NULL, "IdFolder" uniqueidentifier NOT NULL, "Fecha" datetime NOT NULL CONSTRAINT "DF_ada706f300c8f8fbb1b34747d10" DEFAULT getdate(), "Status" varchar(50), "FileName" varchar(255) NOT NULL, CONSTRAINT "PK_1a6eb7a78ac820c6f236e679787" PRIMARY KEY ("Id"))`);
        await queryRunner.query(`CREATE TABLE "Users" ("Id" int NOT NULL IDENTITY(1,1), "Name" varchar(255) NOT NULL, "Email" varchar(255) NOT NULL, "PasswordHash" varchar(255) NOT NULL, "LastAccess" datetime, "Status" int NOT NULL CONSTRAINT "DF_64524b0ded0788e8647c397e9d0" DEFAULT 1, "CreatedAt" datetime NOT NULL CONSTRAINT "DF_0aacbc61aa36d6a82383817a94d" DEFAULT getdate(), "UpdatedAt" datetime NOT NULL CONSTRAINT "DF_ed41b76bd60b64a976d388b6f33" DEFAULT getdate(), CONSTRAINT "UQ_884fdf47515c24dbbf6d89c2d84" UNIQUE ("Email"), CONSTRAINT "PK_329bb2946729a51bd2b19a5159f" PRIMARY KEY ("Id"))`);
        await queryRunner.query(`CREATE INDEX "IX_Users_LastAccess" ON "Users" ("LastAccess") `);
        await queryRunner.query(`CREATE INDEX "IX_Users_Email" ON "Users" ("Email") `);
        await queryRunner.query(`CREATE TABLE "ProductionRequests" ("Id" int NOT NULL IDENTITY(1,1), "Name" nvarchar(255) NOT NULL, "RequestDate" datetime NOT NULL, "Department" nvarchar(255) NOT NULL, "ContactPerson" nvarchar(255) NOT NULL, "AssignedTeam" nvarchar(255) NOT NULL, "DeliveryDate" datetime, "Observations" nvarchar(MAX), "Stage" nvarchar(50) NOT NULL CONSTRAINT "DF_6a6f9eb37268aa2b8f0f23a0d8e" DEFAULT 'request', CONSTRAINT "PK_5a5c7ef9ed11ec0f29bfda39d7c" PRIMARY KEY ("Id"))`);
        await queryRunner.query(`CREATE INDEX "IX_ProductionRequests_Stage" ON "ProductionRequests" ("Stage") `);
        await queryRunner.query(`CREATE INDEX "IX_ProductionRequests_RequestDate" ON "ProductionRequests" ("RequestDate") `);
        await queryRunner.query(`CREATE TABLE "MenuItems" ("Id" int NOT NULL IDENTITY(1,1), "Label" nvarchar(100) NOT NULL, "Icon" nvarchar(50), "Route" nvarchar(255), "ParentId" int, "DisplayOrder" int NOT NULL CONSTRAINT "DF_eae95fc11e32afaefa9786eb6a6" DEFAULT 0, "IsActive" bit NOT NULL CONSTRAINT "DF_4ca7264fd68286a8c4317f89128" DEFAULT 1, CONSTRAINT "PK_0879ed0ca99179839a40380ce89" PRIMARY KEY ("Id"))`);
        await queryRunner.query(`CREATE INDEX "IX_MenuItems_DisplayOrder" ON "MenuItems" ("DisplayOrder", "IsActive") `);
        await queryRunner.query(`ALTER TABLE "PermissionsByUser" ADD CONSTRAINT "FK_9ebeea21a52ecc4731918ff2f22" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "PermissionsByUser" ADD CONSTRAINT "FK_a29ec070e7cd28d3d48bf22e2b3" FOREIGN KEY ("PermissionId") REFERENCES "Permissions"("Id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "LoadDocumentsOcByUser" ADD CONSTRAINT "FK_a5616e93e2db51b27010c67d9fd" FOREIGN KEY ("IdUser") REFERENCES "Users"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "MenuItems" ADD CONSTRAINT "FK_ee2d2372129c05cfe5d1bb55d0d" FOREIGN KEY ("ParentId") REFERENCES "MenuItems"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "MenuItems" DROP CONSTRAINT "FK_ee2d2372129c05cfe5d1bb55d0d"`);
        await queryRunner.query(`ALTER TABLE "LoadDocumentsOcByUser" DROP CONSTRAINT "FK_a5616e93e2db51b27010c67d9fd"`);
        await queryRunner.query(`ALTER TABLE "PermissionsByUser" DROP CONSTRAINT "FK_a29ec070e7cd28d3d48bf22e2b3"`);
        await queryRunner.query(`ALTER TABLE "PermissionsByUser" DROP CONSTRAINT "FK_9ebeea21a52ecc4731918ff2f22"`);
        await queryRunner.query(`DROP INDEX "IX_MenuItems_DisplayOrder" ON "MenuItems"`);
        await queryRunner.query(`DROP TABLE "MenuItems"`);
        await queryRunner.query(`DROP INDEX "IX_ProductionRequests_RequestDate" ON "ProductionRequests"`);
        await queryRunner.query(`DROP INDEX "IX_ProductionRequests_Stage" ON "ProductionRequests"`);
        await queryRunner.query(`DROP TABLE "ProductionRequests"`);
        await queryRunner.query(`DROP INDEX "IX_Users_Email" ON "Users"`);
        await queryRunner.query(`DROP INDEX "IX_Users_LastAccess" ON "Users"`);
        await queryRunner.query(`DROP TABLE "Users"`);
        await queryRunner.query(`DROP TABLE "LoadDocumentsOcByUser"`);
        await queryRunner.query(`DROP INDEX "IX_PermissionsByUser_UserId" ON "PermissionsByUser"`);
        await queryRunner.query(`DROP TABLE "PermissionsByUser"`);
        await queryRunner.query(`DROP TABLE "Permissions"`);
    }

}
