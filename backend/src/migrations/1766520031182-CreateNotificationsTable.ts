import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNotificationsTable1766520031182 implements MigrationInterface {
    name = 'CreateNotificationsTable1766520031182'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "UserByTeam" DROP CONSTRAINT "FK_UserByTeam_Teams"`);
        await queryRunner.query(`ALTER TABLE "UserActionLogs" DROP CONSTRAINT "FK_UserActionLogs_UserId"`);
        await queryRunner.query(`ALTER TABLE "ProductionRequests" DROP CONSTRAINT "FK_7229206609f1ad99612767c53bc"`);
        await queryRunner.query(`ALTER TABLE "MenuItems" DROP CONSTRAINT "FK_53f41f779ad0b4b507958a6c759"`);
        await queryRunner.query(`DROP INDEX "IDX_f2ca4c6f6c7d8b86e663750f17" ON "UserByTeam"`);
        await queryRunner.query(`CREATE TABLE "Notifications" ("Id" int NOT NULL IDENTITY(1,1), "UserId" int NOT NULL, "Title" varchar(255) NOT NULL, "Message" text NOT NULL, "Type" varchar(50) NOT NULL CONSTRAINT "DF_96f08073d4209df8f157e66eec2" DEFAULT 'info', "IsRead" bit NOT NULL CONSTRAINT "DF_bb9558058ac6f04d07fe5d38880" DEFAULT 0, "CreatedAt" datetime NOT NULL CONSTRAINT "DF_185c018bf23ccd40d1435da8266" DEFAULT getdate(), CONSTRAINT "PK_3187c74ea5d53758c632e4dab87" PRIMARY KEY ("Id"))`);
        await queryRunner.query(`CREATE INDEX "IX_Notifications_IsRead" ON "Notifications" ("IsRead") `);
        await queryRunner.query(`CREATE INDEX "IX_Notifications_UserId" ON "Notifications" ("UserId") `);
        await queryRunner.query(`ALTER TABLE "ProductionRequests" DROP COLUMN "AssigningPerson"`);
        await queryRunner.query(`CREATE INDEX "IX_UserByTeam_TeamId" ON "UserByTeam" ("TeamId") `);
        await queryRunner.query(`CREATE INDEX "IX_UserByTeam_UserId" ON "UserByTeam" ("UserId") `);
        await queryRunner.query(`ALTER TABLE "UserByTeam" ADD CONSTRAINT "UQ_f2ca4c6f6c7d8b86e663750f171" UNIQUE ("UserId", "TeamId")`);
        await queryRunner.query(`ALTER TABLE "Notifications" ADD CONSTRAINT "FK_5b8b410cafd7b9c05ab77726482" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "UserActionLogs" ADD CONSTRAINT "FK_7b6e5e8481f97ab31c2152ed8e9" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ProductionRequests" ADD CONSTRAINT "FK_7229206609f1ad99612767c53bc" FOREIGN KEY ("AssignedUserId") REFERENCES "Users"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "MenuItems" ADD CONSTRAINT "FK_53f41f779ad0b4b507958a6c759" FOREIGN KEY ("PermissionId") REFERENCES "Permissions"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "MenuItems" DROP CONSTRAINT "FK_53f41f779ad0b4b507958a6c759"`);
        await queryRunner.query(`ALTER TABLE "ProductionRequests" DROP CONSTRAINT "FK_7229206609f1ad99612767c53bc"`);
        await queryRunner.query(`ALTER TABLE "UserActionLogs" DROP CONSTRAINT "FK_7b6e5e8481f97ab31c2152ed8e9"`);
        await queryRunner.query(`ALTER TABLE "Notifications" DROP CONSTRAINT "FK_5b8b410cafd7b9c05ab77726482"`);
        await queryRunner.query(`ALTER TABLE "UserByTeam" DROP CONSTRAINT "UQ_f2ca4c6f6c7d8b86e663750f171"`);
        await queryRunner.query(`DROP INDEX "IX_UserByTeam_UserId" ON "UserByTeam"`);
        await queryRunner.query(`DROP INDEX "IX_UserByTeam_TeamId" ON "UserByTeam"`);
        await queryRunner.query(`ALTER TABLE "ProductionRequests" ADD "AssigningPerson" nvarchar(255)`);
        await queryRunner.query(`DROP INDEX "IX_Notifications_UserId" ON "Notifications"`);
        await queryRunner.query(`DROP INDEX "IX_Notifications_IsRead" ON "Notifications"`);
        await queryRunner.query(`DROP TABLE "Notifications"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f2ca4c6f6c7d8b86e663750f17" ON "UserByTeam" ("UserId", "TeamId") `);
        await queryRunner.query(`ALTER TABLE "MenuItems" ADD CONSTRAINT "FK_53f41f779ad0b4b507958a6c759" FOREIGN KEY ("PermissionId") REFERENCES "Permissions"("Id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ProductionRequests" ADD CONSTRAINT "FK_7229206609f1ad99612767c53bc" FOREIGN KEY ("AssignedUserId") REFERENCES "Users"("Id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "UserActionLogs" ADD CONSTRAINT "FK_UserActionLogs_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "UserByTeam" ADD CONSTRAINT "FK_UserByTeam_Teams" FOREIGN KEY ("Id") REFERENCES "Teams"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
