import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DynamicFormSubmission } from './DynamicFormSubmission';
import { DynamicWorkflowStage } from './DynamicWorkflowStage';
import { User } from './User';

@Entity('DynamicSubmissionWorkflowState')
export class DynamicSubmissionWorkflowState {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'SubmissionId', type: 'int', nullable: false })
  submissionId!: number;

  @Column({ name: 'StageId', type: 'int', nullable: false })
  stageId!: number;

  @Column({ name: 'AssignedUserId', type: 'int', nullable: false })
  assignedUserId!: number;

  @Column({ name: 'Status', type: 'nvarchar', length: 50, default: 'Pending' })
  status!: string; // 'Pending', 'Approved', 'Rejected'

  @Column({ name: 'ActionedByUserId', type: 'int', nullable: true })
  actionedByUserId!: number | null;

  @Column({ name: 'Notes', type: 'nvarchar', length: 'max', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime' })
  updatedAt!: Date;

  @ManyToOne(() => DynamicFormSubmission, (sub) => sub.workflowStates)
  @JoinColumn({ name: 'SubmissionId' })
  submission!: DynamicFormSubmission;

  @ManyToOne(() => DynamicWorkflowStage)
  @JoinColumn({ name: 'StageId' })
  stage!: DynamicWorkflowStage;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'AssignedUserId' })
  assignedUser!: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ActionedByUserId' })
  actionedByUser!: User | null;
}
