import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddRequireConsecutiveToWorkflows1793000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("DynamicWorkflows");
        if (table && !table.findColumnByName("RequireConsecutive")) {
            await queryRunner.addColumn("DynamicWorkflows", new TableColumn({
                name: "RequireConsecutive",
                type: "bit",
                default: 1,
                isNullable: false
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("DynamicWorkflows");
        if (table && table.findColumnByName("RequireConsecutive")) {
            await queryRunner.dropColumn("DynamicWorkflows", "RequireConsecutive");
        }
    }
}
