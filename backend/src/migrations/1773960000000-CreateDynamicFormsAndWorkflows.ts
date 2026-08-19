import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateDynamicFormsAndWorkflows1773960000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create DynamicForms Table
        await queryRunner.createTable(new Table({
            name: "DynamicForms",
            columns: [
                { name: "Id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                { name: "Name", type: "nvarchar", length: "255", isNullable: false },
                { name: "Description", type: "nvarchar", length: "500", isNullable: true },
                { name: "IsEntryForm", type: "bit", default: 0 },
                { name: "IsActive", type: "bit", default: 1 }
            ]
        }), true);

        // 2. Create DynamicFormFields Table
        await queryRunner.createTable(new Table({
            name: "DynamicFormFields",
            columns: [
                { name: "Id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                { name: "FormId", type: "int", isNullable: false },
                { name: "Name", type: "nvarchar", length: "255", isNullable: false },
                { name: "Label", type: "nvarchar", length: "255", isNullable: false },
                { name: "Description", type: "nvarchar", length: "500", isNullable: true },
                { name: "Type", type: "nvarchar", length: "50", isNullable: false },
                { name: "Placeholder", type: "nvarchar", length: "255", isNullable: true },
                { name: "IsRequired", type: "bit", default: 0 },
                { name: "IsReadOnly", type: "bit", default: 0 },
                { name: "DefaultValueExpression", type: "nvarchar", length: "255", isNullable: true },
                { name: "DisplayOrder", type: "int", default: 0 }
            ]
        }), true);

        await queryRunner.createForeignKey("DynamicFormFields", new TableForeignKey({
            columnNames: ["FormId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "DynamicForms",
            onDelete: "CASCADE"
        }));

        // 3. Create DynamicWorkflowStages Table
        await queryRunner.createTable(new Table({
            name: "DynamicWorkflowStages",
            columns: [
                { name: "Id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                { name: "FormId", type: "int", isNullable: false },
                { name: "Name", type: "nvarchar", length: "255", isNullable: false },
                { name: "Description", type: "nvarchar", length: "500", isNullable: true },
                { name: "StepOrder", type: "int", default: 1 },
                { name: "AssigneeType", type: "nvarchar", length: "50", isNullable: false }, // 'specific_user', 'team', 'requester_boss', 'dynamic_responsible'
                { name: "AssigneeUserId", type: "int", isNullable: true },
                { name: "AssigneeTeamId", type: "int", isNullable: true },
                { name: "FormIdToFill", type: "int", isNullable: true }
            ]
        }), true);

        await queryRunner.createForeignKey("DynamicWorkflowStages", new TableForeignKey({
            columnNames: ["FormId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "DynamicForms",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("DynamicWorkflowStages", new TableForeignKey({
            columnNames: ["AssigneeUserId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "Users",
            onDelete: "SET NULL"
        }));

        await queryRunner.createForeignKey("DynamicWorkflowStages", new TableForeignKey({
            columnNames: ["AssigneeTeamId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "Teams",
            onDelete: "SET NULL"
        }));

        await queryRunner.createForeignKey("DynamicWorkflowStages", new TableForeignKey({
            columnNames: ["FormIdToFill"],
            referencedColumnNames: ["Id"],
            referencedTableName: "DynamicForms",
            onDelete: "NO ACTION"
        }));

        // 4. Create DynamicFormSubmissions Table
        await queryRunner.createTable(new Table({
            name: "DynamicFormSubmissions",
            columns: [
                { name: "Id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                { name: "FormId", type: "int", isNullable: false },
                { name: "RequesterUserId", type: "int", isNullable: false },
                { name: "CreatedAt", type: "datetime", default: "GETDATE()" },
                { name: "CurrentStageId", type: "int", isNullable: true },
                { name: "Status", type: "nvarchar", length: "50", default: "'Pending'" }
            ]
        }), true);

        await queryRunner.createForeignKey("DynamicFormSubmissions", new TableForeignKey({
            columnNames: ["FormId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "DynamicForms",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("DynamicFormSubmissions", new TableForeignKey({
            columnNames: ["RequesterUserId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "Users",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("DynamicFormSubmissions", new TableForeignKey({
            columnNames: ["CurrentStageId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "DynamicWorkflowStages",
            onDelete: "NO ACTION"
        }));

        // 5. Create DynamicFormFieldValues Table
        await queryRunner.createTable(new Table({
            name: "DynamicFormFieldValues",
            columns: [
                { name: "Id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                { name: "SubmissionId", type: "int", isNullable: false },
                { name: "FieldId", type: "int", isNullable: false },
                { name: "Value", type: "nvarchar", length: "max", isNullable: true }
            ]
        }), true);

        await queryRunner.createForeignKey("DynamicFormFieldValues", new TableForeignKey({
            columnNames: ["SubmissionId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "DynamicFormSubmissions",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("DynamicFormFieldValues", new TableForeignKey({
            columnNames: ["FieldId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "DynamicFormFields",
            onDelete: "NO ACTION"
        }));

        // 6. Create DynamicSubmissionWorkflowState Table
        await queryRunner.createTable(new Table({
            name: "DynamicSubmissionWorkflowState",
            columns: [
                { name: "Id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                { name: "SubmissionId", type: "int", isNullable: false },
                { name: "StageId", type: "int", isNullable: false },
                { name: "AssignedUserId", type: "int", isNullable: false },
                { name: "Status", type: "nvarchar", length: "50", default: "'Pending'" }, // Pending, Approved, Rejected
                { name: "ActionedByUserId", type: "int", isNullable: true },
                { name: "Notes", type: "nvarchar", length: "max", isNullable: true },
                { name: "CreatedAt", type: "datetime", default: "GETDATE()" },
                { name: "UpdatedAt", type: "datetime", default: "GETDATE()" }
            ]
        }), true);

        await queryRunner.createForeignKey("DynamicSubmissionWorkflowState", new TableForeignKey({
            columnNames: ["SubmissionId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "DynamicFormSubmissions",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("DynamicSubmissionWorkflowState", new TableForeignKey({
            columnNames: ["StageId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "DynamicWorkflowStages",
            onDelete: "NO ACTION"
        }));

        await queryRunner.createForeignKey("DynamicSubmissionWorkflowState", new TableForeignKey({
            columnNames: ["AssignedUserId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "Users",
            onDelete: "NO ACTION"
        }));

        await queryRunner.createForeignKey("DynamicSubmissionWorkflowState", new TableForeignKey({
            columnNames: ["ActionedByUserId"],
            referencedColumnNames: ["Id"],
            referencedTableName: "Users",
            onDelete: "NO ACTION"
        }));

        // 7. Seed Form Templates and Fields
        // A. Insert Dynamic Forms
        await queryRunner.query(`
            INSERT INTO DynamicForms (Name, Description, IsEntryForm, IsActive) VALUES
            ('CONTENT MARKETING', 'Formulario para solicitudes de Content Marketing', 1, 1),
            ('DATA', 'Formulario para solicitudes de Data', 1, 1),
            ('ESTRATEGIA Y PRODUCCIÓN', 'Formulario para solicitudes de Estrategia y Producción', 1, 1),
            ('IMPLEMENTACIÓN DE CAMPAÑAS', 'Formulario para solicitudes de Implementación de Campañas', 1, 1),
            ('TRÁFICO CALIFICADO', 'Formulario para solicitudes de Tráfico Calificado', 1, 1)
        `);

        // Get inserted form IDs
        const forms = await queryRunner.query(`SELECT Id, Name FROM DynamicForms`);
        const cmFormId = forms.find((f: any) => f.Name === 'CONTENT MARKETING').Id;
        const dataFormId = forms.find((f: any) => f.Name === 'DATA').Id;
        const estFormId = forms.find((f: any) => f.Name === 'ESTRATEGIA Y PRODUCCIÓN').Id;
        const impFormId = forms.find((f: any) => f.Name === 'IMPLEMENTACIÓN DE CAMPAÑAS').Id;
        const trafFormId = forms.find((f: any) => f.Name === 'TRÁFICO CALIFICADO').Id;

        // B. Insert Fields for CONTENT MARKETING
        await queryRunner.query(`
            INSERT INTO DynamicFormFields (FormId, Name, Label, Description, Type, Placeholder, IsRequired, IsReadOnly, DefaultValueExpression, DisplayOrder) VALUES
            (${cmFormId}, 'requestDate', 'Fecha de solicitud', 'Seleccione la fecha en la que realiza la solicitud.', 'datetime', NULL, 1, 1, '{{CURRENT_DATE_TIME}}', 1),
            (${cmFormId}, 'requesterName', 'Nombre del consultor o estratega que realiza la solicitud', 'Indique el nombre completo de la persona responsable de esta solicitud.', 'text', NULL, 1, 1, '{{LOGGED_USER_NAME}}', 2),
            (${cmFormId}, 'clientName', 'Cliente', 'Nombre de la empresa o persona para quien se solicita la cotización.', 'text', 'Nombre de la empresa o persona', 1, 0, NULL, 3),
            (${cmFormId}, 'productService', 'Producto o servicio', 'Especifique el producto o servicio relacionado con la solicitud.', 'text', 'Producto o servicio solicitado', 1, 0, NULL, 4),
            (${cmFormId}, 'projectDescription', 'Breve descripción del proyecto', 'Resuma el objetivo y alcance del proyecto.', 'textarea', 'Resumen del proyecto...', 1, 0, NULL, 5),
            (${cmFormId}, 'requestObjective', 'Objetivo de la solicitud', '¿Qué espera lograr con este proyecto de Content Marketing?', 'textarea', 'Objetivo del proyecto...', 1, 0, NULL, 6),
            (${cmFormId}, 'requestDetails', 'Detalle de lo solicitado', 'Incluya todos los requerimientos para la cotización: formatos, cantidades, tamaños, duraciones, estudios exteriores, etc. Cuanto más detalle, mejor.', 'textarea', 'Detalles de formatos, cantidades, etc.', 1, 0, NULL, 7),
            (${cmFormId}, 'executionDates', 'Fechas de posible ejecución', 'Indique el rango de fechas en que podría ejecutarse el proyecto.', 'text', 'Ej: Rango de fechas o mes estimado', 1, 0, NULL, 8)
        `);

        // C. Insert Fields for other Forms (Generic test fields)
        for (const fId of [dataFormId, estFormId, impFormId, trafFormId]) {
            await queryRunner.query(`
                INSERT INTO DynamicFormFields (FormId, Name, Label, Description, Type, Placeholder, IsRequired, IsReadOnly, DefaultValueExpression, DisplayOrder) VALUES
                (${fId}, 'test1', 'Campo de Prueba 1', 'Ingrese valor de prueba 1', 'text', 'Valor 1', 1, 0, NULL, 1),
                (${fId}, 'test2', 'Campo de Prueba 2', 'Ingrese valor de prueba 2', 'text', 'Valor 2', 1, 0, NULL, 2),
                (${fId}, 'test3', 'Campo de Prueba 3', 'Ingrese valor de prueba 3', 'text', 'Valor 3', 1, 0, NULL, 3)
            `);
        }

        // 8. Seed Workflow Stages dynamically mapping emails to user IDs
        await queryRunner.query(`
            DECLARE @LuisaId INT = (SELECT TOP 1 Id FROM Users WHERE Email = 'luisa.fajardoro@claro.com.co');
            DECLARE @CarlosId INT = (SELECT TOP 1 Id FROM Users WHERE Email = 'carlos.ospina.ext@claro.com.co');
            DECLARE @CamilaId INT = (SELECT TOP 1 Id FROM Users WHERE Email = 'maria.garciaf.ext@claro.com.co');
            DECLARE @DanielId INT = (SELECT TOP 1 Id FROM Users WHERE Email = 'daniel.castaneda@redmasnoticias.com');
            DECLARE @MariaId INT = (SELECT TOP 1 Id FROM Users WHERE Email = 'maria.lopezl@claro.com.co');
            DECLARE @AdminId INT = (SELECT TOP 1 Id FROM Users WHERE Email = 'admin@test.com');

            -- Content Marketing Stage
            INSERT INTO DynamicWorkflowStages (FormId, Name, Description, StepOrder, AssigneeType, AssigneeUserId, AssigneeTeamId, FormIdToFill) VALUES
            (${cmFormId}, 'Aprobación Preventa', 'Revisión inicial de requerimientos de Content Marketing', 1, 'specific_user', COALESCE(@LuisaId, @AdminId), NULL, NULL);

            -- Data Stage
            INSERT INTO DynamicWorkflowStages (FormId, Name, Description, StepOrder, AssigneeType, AssigneeUserId, AssigneeTeamId, FormIdToFill) VALUES
            (${dataFormId}, 'Aprobación Data y Research', 'Revisión técnica de la viabilidad de datos', 1, 'specific_user', COALESCE(@CarlosId, @AdminId), NULL, NULL);

            -- Estrategia Stage
            INSERT INTO DynamicWorkflowStages (FormId, Name, Description, StepOrder, AssigneeType, AssigneeUserId, AssigneeTeamId, FormIdToFill) VALUES
            (${estFormId}, 'Aprobación Estrategia', 'Revisión estratégica de producción y alcance', 1, 'specific_user', COALESCE(@CamilaId, @AdminId), NULL, NULL);

            -- Implementación Stage
            INSERT INTO DynamicWorkflowStages (FormId, Name, Description, StepOrder, AssigneeType, AssigneeUserId, AssigneeTeamId, FormIdToFill) VALUES
            (${impFormId}, 'Planificación Operativa', 'Asignación e implementación de campaña operativa', 1, 'specific_user', COALESCE(@DanielId, @AdminId), NULL, NULL);

            -- Tráfico Stage
            INSERT INTO DynamicWorkflowStages (FormId, Name, Description, StepOrder, AssigneeType, AssigneeUserId, AssigneeTeamId, FormIdToFill) VALUES
            (${trafFormId}, 'Revisión Posventa', 'Monitoreo de tráfico calificado y KPIs', 1, 'specific_user', COALESCE(@MariaId, @AdminId), NULL, NULL);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("DynamicSubmissionWorkflowState");
        await queryRunner.dropTable("DynamicFormFieldValues");
        await queryRunner.dropTable("DynamicFormSubmissions");
        await queryRunner.dropTable("DynamicWorkflowStages");
        await queryRunner.dropTable("DynamicFormFields");
        await queryRunner.dropTable("DynamicForms");
    }

}
