import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index
} from 'typeorm';
import { DynamicFormSubmission } from './DynamicFormSubmission';
import { DynamicSubmissionWorkflowState } from './DynamicSubmissionWorkflowState';
import { User } from './User';

export type StagePriorityLevel = 'Alta' | 'Media' | 'Baja';

@Entity('DynamicStageUserPriorities')
@Unique('UQ_DynamicStageUserPriorities_State_User', ['stateId', 'userId'])
@Index('IX_DynamicStageUserPriorities_User_State', ['userId', 'stateId'])
@Index('IX_DynamicStageUserPriorities_SubmissionId', ['submissionId'])
export class DynamicStageUserPriority {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'SubmissionId', type: 'int', nullable: false })
  submissionId!: number;

  @Column({ name: 'StateId', type: 'int', nullable: false })
  stateId!: number;

  @Column({ name: 'StageId', type: 'int', nullable: true })
  stageId!: number | null;

  @Column({ name: 'UserId', type: 'int', nullable: false })
  userId!: number;

  @Column({ name: 'Priority', type: 'nvarchar', length: 20, nullable: false })
  priority!: StagePriorityLevel;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime' })
  updatedAt!: Date;

  @ManyToOne(() => DynamicFormSubmission)
  @JoinColumn({ name: 'SubmissionId' })
  submission!: DynamicFormSubmission;

  @ManyToOne(() => DynamicSubmissionWorkflowState)
  @JoinColumn({ name: 'StateId' })
  state!: DynamicSubmissionWorkflowState;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'UserId' })
  user!: User;
}
