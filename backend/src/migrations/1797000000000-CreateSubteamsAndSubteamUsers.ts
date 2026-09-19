import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSubteamsAndSubteamUsers1797000000000 implements MigrationInterface {
    name = 'CreateSubteamsAndSubteamUsers1797000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Subteams')
            BEGIN
                CREATE TABLE "Subteams" (
                    "Id" int IDENTITY(1,1) NOT NULL,
                    "TeamId" int NOT NULL,
                    "Name" nvarchar(255) NOT NULL,
                    "Description" nvarchar(500) NULL,
                    "LeaderId" int NULL,
                    "IsActive" bit NOT NULL DEFAULT 1,
                    "CreatedAt" datetime NOT NULL DEFAULT getdate(),
                    "UpdatedAt" datetime NOT NULL DEFAULT getdate(),
                    CONSTRAINT "PK_Subteams" PRIMARY KEY ("Id"),
                    CONSTRAINT "FK_Subteams_TeamId" FOREIGN KEY ("TeamId") REFERENCES "Teams"("Id") ON DELETE CASCADE,
                    CONSTRAINT "FK_Subteams_LeaderId" FOREIGN KEY ("LeaderId") REFERENCES "Users"("Id") ON DELETE SET NULL
                );
                CREATE INDEX "IX_Subteams_TeamId" ON "Subteams" ("TeamId");
            END
        `);

        await queryRunner.query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SubteamUsers')
            BEGIN
                CREATE TABLE "SubteamUsers" (
                    "Id" int IDENTITY(1,1) NOT NULL,
                    "SubteamId" int NOT NULL,
                    "UserId" int NOT NULL,
                    "AssignedAt" datetime NOT NULL DEFAULT getdate(),
                    CONSTRAINT "PK_SubteamUsers" PRIMARY KEY ("Id"),
                    CONSTRAINT "UQ_SubteamUsers_Subteam_User" UNIQUE ("SubteamId", "UserId"),
                    CONSTRAINT "FK_SubteamUsers_SubteamId" FOREIGN KEY ("SubteamId") REFERENCES "Subteams"("Id") ON DELETE CASCADE,
                    CONSTRAINT "FK_SubteamUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE
                );
                CREATE INDEX "IX_SubteamUsers_SubteamId" ON "SubteamUsers" ("SubteamId");
                CREATE INDEX "IX_SubteamUsers_UserId" ON "SubteamUsers" ("UserId");
            END
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "SubteamUsers"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Subteams"`);
    }
}
