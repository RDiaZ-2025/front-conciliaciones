import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddMetadataToTeams1792000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const teamsTable = await queryRunner.getTable("Teams");
        if (teamsTable) {
            if (!teamsTable.findColumnByName("Metadata")) {
                await queryRunner.addColumn("Teams", new TableColumn({
                    name: "Metadata",
                    type: "nvarchar",
                    length: "max",
                    isNullable: true
                }));
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const teamsTable = await queryRunner.getTable("Teams");
        if (teamsTable && teamsTable.findColumnByName("Metadata")) {
            await queryRunner.dropColumn("Teams", "Metadata");
        }
    }
}
