import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInitialFormAndParentSubmissionRelation1785000000000 implements MigrationInterface {
    name = 'AddInitialFormAndParentSubmissionRelation1785000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`ALTER TABLE "DynamicForms" ADD "IsInitialForm" bit NOT NULL DEFAULT 0`);

        await queryRunner.query(`ALTER TABLE "DynamicFormSubmissions" ADD "ParentSubmissionId" int NULL`);

        await queryRunner.query(`
            ALTER TABLE "DynamicFormSubmissions"
            ADD CONSTRAINT "FK_DynamicFormSubmissions_ParentSubmissionId"
            FOREIGN KEY ("ParentSubmissionId") REFERENCES "DynamicFormSubmissions" ("Id")
            ON DELETE NO ACTION
        `);

        await queryRunner.query(`
            INSERT INTO "DynamicForms" ("Name", "Description", "IsEntryForm", "IsActive", "IsInitialForm", "RequireConsecutive", "Icon")
            VALUES ('SOLICITUD INICIAL', 'Formulario de Solicitud Inicial de Servicios', 1, 1, 1, 0, 'file-plus')
        `);

        await queryRunner.query(`
            DECLARE @FormId INT = (SELECT TOP 1 "Id" FROM "DynamicForms" WHERE "IsInitialForm" = 1 AND "Name" = 'SOLICITUD INICIAL');

            INSERT INTO "DynamicFormFields" ("FormId", "Name", "Label", "Description", "Type", "Placeholder", "IsRequired", "IsReadOnly", "DisplayOrder", "IsActive")
            VALUES
            (@FormId, 'title', 'Título de la Solicitud', 'Indique un título corto para su requerimiento', 'text', 'Ej: Campaña de Lanzamiento Q3', 1, 0, 1, 1),
            (@FormId, 'description', 'Descripción / Detalle', 'Describa detalladamente su solicitud de servicios', 'textarea', 'Ingrese aquí el detalle...', 1, 0, 2, 1),
            (@FormId, 'suggestedDate', 'Fecha Sugerida de Entrega', 'Fecha estimada en la que requiere los entregables', 'date', '', 0, 0, 3, 1);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`
            DECLARE @FormId INT = (SELECT TOP 1 "Id" FROM "DynamicForms" WHERE "IsInitialForm" = 1 AND "Name" = 'SOLICITUD INICIAL');
            IF @FormId IS NOT NULL
            BEGIN
                DELETE FROM "DynamicFormFields" WHERE "FormId" = @FormId;
                DELETE FROM "DynamicForms" WHERE "Id" = @FormId;
            END
        `);

        await queryRunner.query(`ALTER TABLE "DynamicFormSubmissions" DROP CONSTRAINT "FK_DynamicFormSubmissions_ParentSubmissionId"`);
        await queryRunner.query(`ALTER TABLE "DynamicFormSubmissions" DROP COLUMN "ParentSubmissionId"`);
        await queryRunner.query(`ALTER TABLE "DynamicForms" DROP COLUMN "IsInitialForm"`);
    }
}
