import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddProjectToMenuItems1773951000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            "MenuItems",
            new TableColumn({
                name: "Project",
                type: "nvarchar",
                length: "10",
                isNullable: false,
                default: "'voc'"
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("MenuItems", "Project");
    }

}
