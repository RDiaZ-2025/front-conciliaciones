import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateNocNewsDraftsForStructuredArticles1795000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Agregar columnas title, subtitle, content y updatedAt a noc_news_drafts si no existen
        await queryRunner.query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'noc_news_drafts' AND COLUMN_NAME = 'title')
            BEGIN
                ALTER TABLE "noc_news_drafts" ADD "title" NVARCHAR(500) NULL;
            END
        `);

        await queryRunner.query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'noc_news_drafts' AND COLUMN_NAME = 'subtitle')
            BEGIN
                ALTER TABLE "noc_news_drafts" ADD "subtitle" NVARCHAR(MAX) NULL;
            END
        `);

        await queryRunner.query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'noc_news_drafts' AND COLUMN_NAME = 'content')
            BEGIN
                ALTER TABLE "noc_news_drafts" ADD "content" NVARCHAR(MAX) NULL;
            END
        `);

        await queryRunner.query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'noc_news_drafts' AND COLUMN_NAME = 'updatedAt')
            BEGIN
                ALTER TABLE "noc_news_drafts" ADD "updatedAt" DATETIME2 NULL;
            END
        `);

        // 2. Asegurar que la columna path permita valores nulos durante la fase de borrador
        await queryRunner.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'noc_news_drafts' AND COLUMN_NAME = 'path' AND IS_NULLABLE = 'NO')
            BEGIN
                ALTER TABLE "noc_news_drafts" ALTER COLUMN "path" NVARCHAR(500) NULL;
            END
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'noc_news_drafts' AND COLUMN_NAME = 'title')
            BEGIN
                ALTER TABLE "noc_news_drafts" DROP COLUMN "title";
            END
        `);

        await queryRunner.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'noc_news_drafts' AND COLUMN_NAME = 'subtitle')
            BEGIN
                ALTER TABLE "noc_news_drafts" DROP COLUMN "subtitle";
            END
        `);

        await queryRunner.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'noc_news_drafts' AND COLUMN_NAME = 'content')
            BEGIN
                ALTER TABLE "noc_news_drafts" DROP COLUMN "content";
            END
        `);

        await queryRunner.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'noc_news_drafts' AND COLUMN_NAME = 'updatedAt')
            BEGIN
                ALTER TABLE "noc_news_drafts" DROP COLUMN "updatedAt";
            END
        `);
    }
}
