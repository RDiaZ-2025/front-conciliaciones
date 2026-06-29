import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNocNewsSchedulerTable1773800000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            IF OBJECT_ID('noc_news_scheduler', 'U') IS NULL
            BEGIN
                CREATE TABLE noc_news_scheduler (
                    id NVARCHAR(36) NOT NULL PRIMARY KEY,
                    name NVARCHAR(255) NOT NULL,
                    topic NVARCHAR(255) NOT NULL,
                    userInstructions NVARCHAR(MAX) NULL,
                    sources NVARCHAR(MAX) NOT NULL,
                    url NVARCHAR(500) NOT NULL,
                    method NVARCHAR(10) NOT NULL DEFAULT 'POST',
                    startAt DATETIME2 NOT NULL,
                    intervalMinutes INT NOT NULL,
                    cronExpression NVARCHAR(100) NULL,
                    isActive BIT NOT NULL DEFAULT 1,
                    status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
                    lastRunAt DATETIME2 NULL,
                    nextRunAt DATETIME2 NULL,
                    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
                    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
                )
            END
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS noc_news_scheduler`);
    }

}
