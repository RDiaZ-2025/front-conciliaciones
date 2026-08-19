import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class AddLeaderAndWorkflowToTeams1791000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const teamsTable = await queryRunner.getTable("Teams");
        if (teamsTable) {
            // 1. Add LeaderId column if it doesn't exist
            if (!teamsTable.findColumnByName("LeaderId")) {
                await queryRunner.addColumn("Teams", new TableColumn({
                    name: "LeaderId",
                    type: "int",
                    isNullable: true
                }));

                await queryRunner.createForeignKey("Teams", new TableForeignKey({
                    columnNames: ["LeaderId"],
                    referencedColumnNames: ["Id"],
                    referencedTableName: "Users",
                    onDelete: "SET NULL"
                }));
            }

            // 2. Add DefaultWorkflowId column if it doesn't exist
            if (!teamsTable.findColumnByName("DefaultWorkflowId")) {
                await queryRunner.addColumn("Teams", new TableColumn({
                    name: "DefaultWorkflowId",
                    type: "int",
                    isNullable: true
                }));

                const workflowsTableExists = await queryRunner.hasTable("DynamicWorkflows");
                if (workflowsTableExists) {
                    await queryRunner.createForeignKey("Teams", new TableForeignKey({
                        columnNames: ["DefaultWorkflowId"],
                        referencedColumnNames: ["Id"],
                        referencedTableName: "DynamicWorkflows",
                        onDelete: "SET NULL"
                    }));
                }
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const teamsTable = await queryRunner.getTable("Teams");
        if (teamsTable) {
            if (teamsTable.findColumnByName("DefaultWorkflowId")) {
                await queryRunner.dropColumn("Teams", "DefaultWorkflowId");
            }
            if (teamsTable.findColumnByName("LeaderId")) {
                await queryRunner.dropColumn("Teams", "LeaderId");
            }
        }
    }
}
