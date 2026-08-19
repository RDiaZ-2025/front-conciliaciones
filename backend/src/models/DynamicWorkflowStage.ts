import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { DynamicForm } from './DynamicForm';
import { DynamicWorkflow } from './DynamicWorkflow';
import { User } from './User';
import { Team } from './Team';

@Entity('DynamicWorkflowStages')
export class DynamicWorkflowStage {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'WorkflowId', type: 'int', nullable: true })
  workflowId!: number | null;

  @Column({ name: 'FormId', type: 'int', nullable: true })
  formId!: number | null;

  @Column({ name: 'IsDeleted', type: 'bit', default: false })
  isDeleted!: boolean;

  @Column({ name: 'Name', type: 'nvarchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'Description', type: 'nvarchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ name: 'StepOrder', type: 'int', default: 1 })
  stepOrder!: number;

  @Column({ name: 'AssigneeType', type: 'nvarchar', length: 50, nullable: false })
  assigneeType!: string; // 'specific_user', 'team', 'team_random', 'team_workload', 'team_leader', 'subflow', 'requester_boss', 'requester', 'previous_stage_actioner', 'previous_stage_team_random', 'multiple_users'

  @Column({ name: 'AssigneeUserId', type: 'int', nullable: true })
  assigneeUserId!: number | null;

  @Column({ name: 'AssigneeTeamId', type: 'int', nullable: true })
  assigneeTeamId!: number | null;

  @Column({ name: 'FormIdToFill', type: 'int', nullable: true })
  formIdToFill!: number | null;

  @Column({ name: 'RejectionTargetType', type: 'nvarchar', length: 50, nullable: true, default: 'previous_sender' })
  rejectionTargetType!: string | null;

  @Column({ name: 'RejectionTargetUserId', type: 'int', nullable: true })
  rejectionTargetUserId!: number | null;

  @Column({ name: 'RejectionTargetTeamId', type: 'int', nullable: true })
  rejectionTargetTeamId!: number | null;

  @Column({ name: 'RequireCommentOnApprove', type: 'bit', default: false })
  requireCommentOnApprove!: boolean;

  @Column({ name: 'ExcludeTeamLeader', type: 'bit', default: false, nullable: true })
  excludeTeamLeader!: boolean;

  @Column({ name: 'AssigneeUserIds', type: 'nvarchar', length: 'max', nullable: true })
  assigneeUserIds!: string | null;

  @ManyToOne(() => DynamicWorkflow, (workflow) => workflow.stages)
  @JoinColumn({ name: 'WorkflowId' })
  workflow!: DynamicWorkflow | null;

  @ManyToOne(() => DynamicForm, (form) => form.stages)
  @JoinColumn({ name: 'FormId' })
  form!: DynamicForm | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'AssigneeUserId' })
  assigneeUser!: User | null;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'AssigneeTeamId' })
  assigneeTeam!: Team | null;

  @ManyToOne(() => DynamicForm)
  @JoinColumn({ name: 'FormIdToFill' })
  formToFill!: DynamicForm | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'RejectionTargetUserId' })
  rejectionTargetUser!: User | null;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'RejectionTargetTeamId' })
  rejectionTargetTeam!: Team | null;
}
