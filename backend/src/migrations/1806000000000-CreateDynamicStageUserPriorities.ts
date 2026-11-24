import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDynamicStageUserPriorities1806000000000 implements MigrationInterface {
    name = 'CreateDynamicStageUserPriorities1806000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            IF OBJECT_ID(N'[dbo].[DynamicStageUserPriorities]', N'U') IS NULL
            BEGIN
                CREATE TABLE [DynamicStageUserPriorities] (
                    [Id] int NOT NULL IDENTITY(1,1),
                    [SubmissionId] int NOT NULL,
                    [StateId] int NOT NULL,
                    [StageId] int NULL,
                    [UserId] int NOT NULL,
                    [Priority] nvarchar(20) NOT NULL,
                    [CreatedAt] datetime NOT NULL CONSTRAINT [DF_DynamicStageUserPriorities_CreatedAt] DEFAULT getdate(),
                    [UpdatedAt] datetime NOT NULL CONSTRAINT [DF_DynamicStageUserPriorities_UpdatedAt] DEFAULT getdate(),
                    CONSTRAINT [PK_DynamicStageUserPriorities] PRIMARY KEY ([Id]),
                    CONSTRAINT [UQ_DynamicStageUserPriorities_State_User] UNIQUE ([StateId], [UserId]),
                    CONSTRAINT [CK_DynamicStageUserPriorities_Priority] CHECK ([Priority] IN (N'Alta', N'Media', N'Baja')),
                    CONSTRAINT [FK_DynamicStageUserPriorities_Submission] FOREIGN KEY ([SubmissionId]) REFERENCES [DynamicFormSubmissions]([Id]),
                    CONSTRAINT [FK_DynamicStageUserPriorities_State] FOREIGN KEY ([StateId]) REFERENCES [DynamicSubmissionWorkflowState]([Id]),
                    CONSTRAINT [FK_DynamicStageUserPriorities_User] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id])
                );
                CREATE INDEX [IX_DynamicStageUserPriorities_User_State] ON [DynamicStageUserPriorities]([UserId], [StateId]);
                CREATE INDEX [IX_DynamicStageUserPriorities_SubmissionId] ON [DynamicStageUserPriorities]([SubmissionId]);
            END
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`IF OBJECT_ID(N'[dbo].[DynamicStageUserPriorities]', N'U') IS NOT NULL DROP TABLE [DynamicStageUserPriorities]`);
    }
}
