import { MigrationInterface, QueryRunner } from "typeorm";

export class DropLegacyMenuItems1765033726523 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys first if they exist (unlikely if we are just dropping the table, but good practice if we knew them)
        // Since we don't know the exact FK names on MENU_ITEMS, we'll just try to drop the table.
        // However, if MENU_ITEMS has self-referencing FKs, we might need to handle that.
        
        // Check if table exists before dropping
        const tableExists = await queryRunner.hasTable("MENU_ITEMS");
        if (tableExists) {
            await queryRunner.query(`DROP TABLE "MENU_ITEMS"`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // We don't want to restore the legacy table in the down migration
        // as it is being permanently removed.
    }

}
