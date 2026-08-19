import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateNocNewsDrafts1784000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Add publishAutomatically column to noc_news_scheduler
        await queryRunner.query(`
            ALTER TABLE "noc_news_scheduler" 
            ADD "publishAutomatically" bit NOT NULL DEFAULT 0
        `);

        // 2. Create noc_news_drafts table
        await queryRunner.createTable(new Table({
            name: "noc_news_drafts",
            columns: [
                {
                    name: "id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "scheduleId",
                    type: "nvarchar",
                    length: "36",
                    isNullable: false
                },
                {
                    name: "path",
                    type: "nvarchar",
                    length: "500",
                    isNullable: false
                },
                {
                    name: "status",
                    type: "nvarchar",
                    length: "50",
                    isNullable: false,
                    default: "'pending'"
                },
                {
                    name: "createdAt",
                    type: "datetime2",
                    default: "GETDATE()"
                },
                {
                    name: "publishedAt",
                    type: "datetime2",
                    isNullable: true
                }
            ]
        }), true);

        // 3. Add foreign key
        await queryRunner.createForeignKey("noc_news_drafts", new TableForeignKey({
            columnNames: ["scheduleId"],
            referencedColumnNames: ["id"],
            referencedTableName: "noc_news_scheduler",
            onDelete: "CASCADE"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("noc_news_drafts");
        if (table) {
            const fk = table.foreignKeys.find(fk => fk.columnNames.indexOf("scheduleId") !== -1);
            if (fk) {
                await queryRunner.dropForeignKey("noc_news_drafts", fk);
            }
            await queryRunner.dropTable("noc_news_drafts");
        }

        await queryRunner.query(`
            ALTER TABLE "noc_news_scheduler" 
            DROP COLUMN "publishAutomatically"
        `);
    }
}
