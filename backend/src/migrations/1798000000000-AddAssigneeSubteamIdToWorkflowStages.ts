import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAssigneeSubteamIdToWorkflowStages1798000000000 implements MigrationInterface {
    name = 'AddAssigneeSubteamIdToWorkflowStages1798000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE object_id = OBJECT_ID(N'[dbo].[DynamicWorkflowStages]') 
                AND name = 'AssigneeSubteamId'
            )
            BEGIN
                ALTER TABLE [DynamicWorkflowStages] ADD [AssigneeSubteamId] int NULL;
            END
        `);

        await queryRunner.query(`
            IF NOT EXISTS (
                SELECT * FROM sys.foreign_keys 
                WHERE object_id = OBJECT_ID(N'[dbo].[FK_DynamicWorkflowStages_AssigneeSubteamId]')
            )
            BEGIN
                ALTER TABLE [DynamicWorkflowStages] ADD CONSTRAINT [FK_DynamicWorkflowStages_AssigneeSubteamId] FOREIGN KEY ([AssigneeSubteamId]) REFERENCES [Subteams]([Id]) ON DELETE NO ACTION;
            END
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            IF EXISTS (
                SELECT * FROM sys.foreign_keys 
                WHERE object_id = OBJECT_ID(N'[dbo].[FK_DynamicWorkflowStages_AssigneeSubteamId]')
            )
            BEGIN
                ALTER TABLE [DynamicWorkflowStages] DROP CONSTRAINT [FK_DynamicWorkflowStages_AssigneeSubteamId];
            END
        `);

        await queryRunner.query(`
            IF EXISTS (
                SELECT * FROM sys.columns 
                WHERE object_id = OBJECT_ID(N'[dbo].[DynamicWorkflowStages]') 
                AND name = 'AssigneeSubteamId'
            )
            BEGIN
                ALTER TABLE [DynamicWorkflowStages] DROP COLUMN [AssigneeSubteamId];
            END
        `);
    }
}
