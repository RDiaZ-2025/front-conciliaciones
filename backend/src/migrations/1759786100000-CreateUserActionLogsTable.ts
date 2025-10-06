import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserActionLogsTable1759786100000 implements MigrationInterface {
    name = 'CreateUserActionLogsTable1759786100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "UserActionLogs" (
                "Id" int NOT NULL IDENTITY(1,1),
                "UserId" int NULL,
                "Method" varchar(10) NOT NULL,
                "Url" varchar(500) NOT NULL,
                "Action" varchar(100) NOT NULL,
                "ResourceType" varchar(50) NULL,
                "ResourceId" varchar(50) NULL,
                "StatusCode" int NOT NULL,
                "IpAddress" varchar(45) NULL,
                "UserAgent" varchar(500) NULL,
                "RequestBody" text NULL,
                "ResponseBody" text NULL,
                "Metadata" text NULL,
                "Duration" int NULL,
                "ErrorMessage" text NULL,
                "CreatedAt" datetime NOT NULL CONSTRAINT "DF_UserActionLogs_CreatedAt" DEFAULT getdate(),
                CONSTRAINT "PK_UserActionLogs_Id" PRIMARY KEY ("Id")
            )
        `);

        await queryRunner.query(`CREATE INDEX "IX_UserActionLogs_UserId" ON "UserActionLogs" ("UserId")`);
        await queryRunner.query(`CREATE INDEX "IX_UserActionLogs_Action" ON "UserActionLogs" ("Action")`);
        await queryRunner.query(`CREATE INDEX "IX_UserActionLogs_CreatedAt" ON "UserActionLogs" ("CreatedAt")`);
        await queryRunner.query(`CREATE INDEX "IX_UserActionLogs_IpAddress" ON "UserActionLogs" ("IpAddress")`);

        await queryRunner.query(`
            ALTER TABLE "UserActionLogs" 
            ADD CONSTRAINT "FK_UserActionLogs_UserId" 
            FOREIGN KEY ("UserId") REFERENCES "Users"("Id") 
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "UserActionLogs" DROP CONSTRAINT "FK_UserActionLogs_UserId"`);
        await queryRunner.query(`DROP INDEX "IX_UserActionLogs_IpAddress" ON "UserActionLogs"`);
        await queryRunner.query(`DROP INDEX "IX_UserActionLogs_CreatedAt" ON "UserActionLogs"`);
        await queryRunner.query(`DROP INDEX "IX_UserActionLogs_Action" ON "UserActionLogs"`);
        await queryRunner.query(`DROP INDEX "IX_UserActionLogs_UserId" ON "UserActionLogs"`);
        await queryRunner.query(`DROP TABLE "UserActionLogs"`);
    }
}