import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDynamicSubmissionComments1805000000000 implements MigrationInterface {
    name = 'CreateDynamicSubmissionComments1805000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            IF OBJECT_ID(N'[dbo].[DynamicSubmissionComments]', N'U') IS NULL
            BEGIN
                CREATE TABLE [DynamicSubmissionComments] (
                    [Id] int NOT NULL IDENTITY(1,1),
                    [SubmissionId] int NOT NULL,
                    [StateId] int NOT NULL,
                    [UserId] int NOT NULL,
                    [Comment] nvarchar(max) NOT NULL,
                    [CreatedAt] datetime NOT NULL CONSTRAINT [DF_DynamicSubmissionComments_CreatedAt] DEFAULT getdate(),
                    CONSTRAINT [PK_DynamicSubmissionComments] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_DynamicSubmissionComments_Submission] FOREIGN KEY ([SubmissionId]) REFERENCES [DynamicFormSubmissions]([Id]),
                    CONSTRAINT [FK_DynamicSubmissionComments_State] FOREIGN KEY ([StateId]) REFERENCES [DynamicSubmissionWorkflowState]([Id]),
                    CONSTRAINT [FK_DynamicSubmissionComments_User] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id])
                );
                CREATE INDEX [IX_DynamicSubmissionComments_SubmissionId] ON [DynamicSubmissionComments]([SubmissionId]);
            END
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`IF OBJECT_ID(N'[dbo].[DynamicSubmissionComments]', N'U') IS NOT NULL DROP TABLE [DynamicSubmissionComments]`);
    }
}
