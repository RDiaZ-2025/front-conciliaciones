import { MigrationInterface, QueryRunner } from "typeorm";

export class AddScheduleConfigToNocNewsScheduler1773900000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Add scheduleConfig column as NULL first to prevent failure on existing rows
        await queryRunner.query(`
            IF COL_LENGTH('noc_news_scheduler', 'scheduleConfig') IS NULL
            BEGIN
                ALTER TABLE noc_news_scheduler 
                ADD scheduleConfig NVARCHAR(MAX) NULL;
            END
        `);

        // 2. Populate existing rows with a default config based on their intervalMinutes
        await queryRunner.query(`
            UPDATE noc_news_scheduler
            SET scheduleConfig = '{"type":"interval","intervalMinutes":' + CAST(intervalMinutes AS VARCHAR(10)) + '}'
            WHERE scheduleConfig IS NULL;
        `);

        // 3. Make scheduleConfig NOT NULL now that data is populated
        await queryRunner.query(`
            ALTER TABLE noc_news_scheduler
            ALTER COLUMN scheduleConfig NVARCHAR(MAX) NOT NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            IF COL_LENGTH('noc_news_scheduler', 'scheduleConfig') IS NOT NULL
            BEGIN
                ALTER TABLE noc_news_scheduler 
                DROP COLUMN scheduleConfig;
            END
        `);
    }
}
