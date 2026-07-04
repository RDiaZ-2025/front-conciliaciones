import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRejectionRoutingToWorkflowStages1773990000000 implements MigrationInterface {
    name = 'AddRejectionRoutingToWorkflowStages1773990000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "DynamicWorkflowStages" ADD "RejectionTargetType" nvarchar(50) NULL CONSTRAINT "DF_WorkflowStages_RejectionTargetType" DEFAULT 'previous_sender'`);
        await queryRunner.query(`ALTER TABLE "DynamicWorkflowStages" ADD "RejectionTargetUserId" int NULL`);
        await queryRunner.query(`ALTER TABLE "DynamicWorkflowStages" ADD "RejectionTargetTeamId" int NULL`);
        
        // Add foreign key constraints
        await queryRunner.query(`ALTER TABLE "DynamicWorkflowStages" ADD CONSTRAINT "FK_WorkflowStages_RejectionTargetUserId" FOREIGN KEY ("RejectionTargetUserId") REFERENCES "Users"("Id") ON DELETE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "DynamicWorkflowStages" ADD CONSTRAINT "FK_WorkflowStages_RejectionTargetTeamId" FOREIGN KEY ("RejectionTargetTeamId") REFERENCES "Teams"("Id") ON DELETE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "DynamicWorkflowStages" DROP CONSTRAINT "FK_WorkflowStages_RejectionTargetTeamId"`);
        await queryRunner.query(`ALTER TABLE "DynamicWorkflowStages" DROP CONSTRAINT "FK_WorkflowStages_RejectionTargetUserId"`);
        await queryRunner.query(`ALTER TABLE "DynamicWorkflowStages" DROP COLUMN "RejectionTargetTeamId"`);
        await queryRunner.query(`ALTER TABLE "DynamicWorkflowStages" DROP COLUMN "RejectionTargetUserId"`);
        await queryRunner.query(`ALTER TABLE "DynamicWorkflowStages" DROP COLUMN "RejectionTargetType"`);
    }
}
