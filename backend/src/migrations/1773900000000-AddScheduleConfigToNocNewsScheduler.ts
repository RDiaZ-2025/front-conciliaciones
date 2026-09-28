import { MigrationInterface, QueryRunner } from "typeorm";

export class AddScheduleConfigToNocNewsScheduler1773900000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`
            IF COL_LENGTH('noc_news_scheduler', 'scheduleConfig') IS NULL
            BEGIN
                ALTER TABLE noc_news_scheduler
                ADD scheduleConfig NVARCHAR(MAX) NULL;
            END
        `);

        await queryRunner.query(`
            UPDATE noc_news_scheduler
            SET scheduleConfig = '{"type":"interval","intervalMinutes":' + CAST(intervalMinutes AS VARCHAR(10)) + '}'
            WHERE scheduleConfig IS NULL;
        `);

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
