import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNextStageAssigneeOptionsToWorkflowStages1801000000000 implements MigrationInterface {
    name = 'AddNextStageAssigneeOptionsToWorkflowStages1801000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE object_id = OBJECT_ID(N'[dbo].[DynamicWorkflowStages]') 
                AND name = 'AllowChooseNextStageAssignee'
            )
            BEGIN
                ALTER TABLE [DynamicWorkflowStages] ADD [AllowChooseNextStageAssignee] bit NULL CONSTRAINT [DF_DynamicWorkflowStages_AllowChooseNextStageAssignee] DEFAULT 0;
            END
        `);

        await queryRunner.query(`
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE object_id = OBJECT_ID(N'[dbo].[DynamicWorkflowStages]') 
                AND name = 'NextStageAssigneeOptions'
            )
            BEGIN
                ALTER TABLE [DynamicWorkflowStages] ADD [NextStageAssigneeOptions] nvarchar(max) NULL;
            END
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            IF EXISTS (
                SELECT * FROM sys.default_constraints
                WHERE object_id = OBJECT_ID(N'[dbo].[DF_DynamicWorkflowStages_AllowChooseNextStageAssignee]')
            )
            BEGIN
                ALTER TABLE [DynamicWorkflowStages] DROP CONSTRAINT [DF_DynamicWorkflowStages_AllowChooseNextStageAssignee];
            END
        `);

        await queryRunner.query(`
            IF EXISTS (
                SELECT * FROM sys.columns 
                WHERE object_id = OBJECT_ID(N'[dbo].[DynamicWorkflowStages]') 
                AND name = 'AllowChooseNextStageAssignee'
            )
            BEGIN
                ALTER TABLE [DynamicWorkflowStages] DROP COLUMN [AllowChooseNextStageAssignee];
            END
        `);

        await queryRunner.query(`
            IF EXISTS (
                SELECT * FROM sys.columns 
                WHERE object_id = OBJECT_ID(N'[dbo].[DynamicWorkflowStages]') 
                AND name = 'NextStageAssigneeOptions'
            )
            BEGIN
                ALTER TABLE [DynamicWorkflowStages] DROP COLUMN [NextStageAssigneeOptions];
            END
        `);
    }
}
