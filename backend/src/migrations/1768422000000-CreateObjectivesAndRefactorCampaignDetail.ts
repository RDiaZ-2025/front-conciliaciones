import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableColumn } from "typeorm";

export class CreateObjectivesAndRefactorCampaignDetail1768422000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create Objectives table
        await queryRunner.createTable(new Table({
            name: "Objectives",
            columns: [
                {
                    name: "Id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment",
                },
                {
                    name: "Name",
                    type: "nvarchar",
                    length: "255",
                    isNullable: false,
                },
            ],
        }), true);

        // 2. Insert default values
        const objectives = [
            'Lanzamiento',
            'Posicionamiento',
            'Mantenimiento',
            'Promocional',
            'Institucional'
        ];

        for (const name of objectives) {
            await queryRunner.query(`INSERT INTO Objectives (Name) VALUES ('${name}')`);
        }

        // 3. Add ObjectiveId column to CampaignDetails
        await queryRunner.addColumn("CampaignDetails", new TableColumn({
            name: "ObjectiveId",
            type: "int",
            isNullable: true
        }));

        // 4. Create Foreign Key
        await queryRunner.createForeignKey("CampaignDetails", new TableForeignKey({
            columnNames: ["ObjectiveId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "Objectives",
            onDelete: "SET NULL"
        }));

        // 5. Migrate existing data
        // For each objective in Objectives table, update CampaignDetails matching the name
        const savedObjectives = await queryRunner.query(`SELECT Id, Name FROM Objectives`);
        for (const obj of savedObjectives) {
            await queryRunner.query(`
                UPDATE CampaignDetails 
                SET ObjectiveId = ${obj.Id} 
                WHERE Objective = '${obj.Name}'
            `);
        }

        // 6. Drop old Objective column
        await queryRunner.dropColumn("CampaignDetails", "Objective");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert changes
        
        // 1. Add back Objective column
        await queryRunner.addColumn("CampaignDetails", new TableColumn({
            name: "Objective",
            type: "nvarchar",
            length: "255",
            isNullable: true
        }));

        // 2. Restore data from ObjectiveId
        const savedObjectives = await queryRunner.query(`SELECT Id, Name FROM Objectives`);
        for (const obj of savedObjectives) {
            await queryRunner.query(`
                UPDATE CampaignDetails 
                SET Objective = '${obj.Name}' 
                WHERE ObjectiveId = ${obj.Id}
            `);
        }

        // 3. Drop FK and ObjectiveId column
        const table = await queryRunner.getTable("CampaignDetails");
        const foreignKey = table!.foreignKeys.find(fk => fk.columnNames.indexOf("ObjectiveId") !== -1);
        await queryRunner.dropForeignKey("CampaignDetails", foreignKey!);
        await queryRunner.dropColumn("CampaignDetails", "ObjectiveId");

        // 4. Drop Objectives table
        await queryRunner.dropTable("Objectives");
    }

}
