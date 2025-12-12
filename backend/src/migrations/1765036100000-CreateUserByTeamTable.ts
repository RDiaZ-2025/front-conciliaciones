import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateUserByTeamTable1765036100000 implements MigrationInterface {
    name = 'CreateUserByTeamTable1765036100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "UserByTeam",
            columns: [
                {
                    name: "Id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment",
                },
                {
                    name: "UserId",
                    type: "int",
                },
                {
                    name: "TeamId",
                    type: "int",
                },
            ],
            foreignKeys: [
                {
                    columnNames: ["UserId"],
                    referencedTableName: "Users",
                    referencedColumnNames: ["Id"],
                    onDelete: "CASCADE",
                },
                {
                    columnNames: ["TeamId"],
                    referencedTableName: "Teams",
                    referencedColumnNames: ["Id"],
                    onDelete: "CASCADE",
                },
            ],
            indices: [
                {
                    columnNames: ["UserId", "TeamId"],
                    isUnique: true,
                },
            ],
        }), true);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("UserByTeam");
        if (table) {
            const foreignKeyUser = table.foreignKeys.find(fk => fk.columnNames.indexOf("UserId") !== -1);
            if (foreignKeyUser) {
                await queryRunner.dropForeignKey("UserByTeam", foreignKeyUser);
            }
            const foreignKeyTeam = table.foreignKeys.find(fk => fk.columnNames.indexOf("TeamId") !== -1);
            if (foreignKeyTeam) {
                await queryRunner.dropForeignKey("UserByTeam", foreignKeyTeam);
            }
        }
        await queryRunner.dropTable("UserByTeam");
    }

}
