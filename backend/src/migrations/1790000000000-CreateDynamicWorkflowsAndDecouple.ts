import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableColumn } from "typeorm";

export class CreateDynamicWorkflowsAndDecouple1790000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        const tableExists = await queryRunner.hasTable("DynamicWorkflows");
        if (!tableExists) {
            await queryRunner.createTable(new Table({
                name: "DynamicWorkflows",
                columns: [
                    { name: "Id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                    { name: "Name", type: "nvarchar", length: "255", isNullable: false },
                    { name: "Description", type: "nvarchar", length: "500", isNullable: true },
                    { name: "IsActive", type: "bit", default: 1 },
                    { name: "CreatedAt", type: "datetime", default: "GETDATE()" },
                    { name: "UpdatedAt", type: "datetime", default: "GETDATE()" }
                ]
            }), true);
        }

        const stagesTable = await queryRunner.getTable("DynamicWorkflowStages");
        if (stagesTable && !stagesTable.findColumnByName("WorkflowId")) {
            await queryRunner.addColumn("DynamicWorkflowStages", new TableColumn({
                name: "WorkflowId",
                type: "int",
                isNullable: true
            }));

            await queryRunner.createForeignKey("DynamicWorkflowStages", new TableForeignKey({
                columnNames: ["WorkflowId"],
                referencedColumnNames: ["Id"],
                referencedTableName: "DynamicWorkflows",
                onDelete: "CASCADE"
            }));
        }

        const formsTable = await queryRunner.getTable("DynamicForms");
        if (formsTable && !formsTable.findColumnByName("WorkflowId")) {
            await queryRunner.addColumn("DynamicForms", new TableColumn({
                name: "WorkflowId",
                type: "int",
                isNullable: true
            }));

            await queryRunner.createForeignKey("DynamicForms", new TableForeignKey({
                columnNames: ["WorkflowId"],
                referencedColumnNames: ["Id"],
                referencedTableName: "DynamicWorkflows",
                onDelete: "SET NULL"
            }));
        }

        const subsTable = await queryRunner.getTable("DynamicFormSubmissions");
        if (subsTable && !subsTable.findColumnByName("WorkflowId")) {
            await queryRunner.addColumn("DynamicFormSubmissions", new TableColumn({
                name: "WorkflowId",
                type: "int",
                isNullable: true
            }));

            await queryRunner.createForeignKey("DynamicFormSubmissions", new TableForeignKey({
                columnNames: ["WorkflowId"],
                referencedColumnNames: ["Id"],
                referencedTableName: "DynamicWorkflows",
                onDelete: "NO ACTION"
            }));
        }

        const formsWithStages = await queryRunner.query(`
            SELECT DISTINCT f.Id, f.Name, f.Description
            FROM DynamicForms f
            INNER JOIN DynamicWorkflowStages s ON s.FormId = f.Id
        `);

        for (const f of formsWithStages) {
            const workflowName = f.Name ? `Flujo: ${f.Name}` : `Flujo #${f.Id}`;
            const existingWf = await queryRunner.query(`
                SELECT TOP 1 Id FROM DynamicWorkflows WHERE Name = '${workflowName.replace(/'/g, "''")}'
            `);

            let wfId: number;
            if (existingWf && existingWf.length > 0) {
                wfId = existingWf[0].Id;
            } else {
                const inserted = await queryRunner.query(`
                    INSERT INTO DynamicWorkflows (Name, Description, IsActive, CreatedAt, UpdatedAt)
                    OUTPUT INSERTED.Id
                    VALUES ('${workflowName.replace(/'/g, "''")}', '${(f.Description || '').replace(/'/g, "''")}', 1, GETDATE(), GETDATE())
                `);
                wfId = inserted[0].Id;
            }

            await queryRunner.query(`
                UPDATE DynamicWorkflowStages
                SET WorkflowId = ${wfId}
                WHERE FormId = ${f.Id} AND (WorkflowId IS NULL OR WorkflowId = 0)
            `);

            await queryRunner.query(`
                UPDATE DynamicForms
                SET WorkflowId = ${wfId}
                WHERE Id = ${f.Id} AND (WorkflowId IS NULL OR WorkflowId = 0)
            `);
        }

        const fieldValuesTable = await queryRunner.getTable("DynamicFormFieldValues");
        if (fieldValuesTable && fieldValuesTable.findColumnByName("WorkflowStateId")) {
            await queryRunner.query(`UPDATE DynamicFormFieldValues SET WorkflowStateId = NULL WHERE WorkflowStateId IS NOT NULL;`);
        }
        await queryRunner.query(`
            DELETE FROM DynamicFormFieldValues;
            DELETE FROM DynamicSubmissionWorkflowState;
            DELETE FROM DynamicFormSubmissions;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

        const subsTable = await queryRunner.getTable("DynamicFormSubmissions");
        if (subsTable && subsTable.findColumnByName("WorkflowId")) {
            await queryRunner.dropColumn("DynamicFormSubmissions", "WorkflowId");
        }

        const formsTable = await queryRunner.getTable("DynamicForms");
        if (formsTable && formsTable.findColumnByName("WorkflowId")) {
            await queryRunner.dropColumn("DynamicForms", "WorkflowId");
        }

        const stagesTable = await queryRunner.getTable("DynamicWorkflowStages");
        if (stagesTable && stagesTable.findColumnByName("WorkflowId")) {
            await queryRunner.dropColumn("DynamicWorkflowStages", "WorkflowId");
        }

        await queryRunner.dropTable("DynamicWorkflows", true);
    }
}
