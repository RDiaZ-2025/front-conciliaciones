import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DynamicFormSubmission } from './DynamicFormSubmission';
import { DynamicSubmissionWorkflowState } from './DynamicSubmissionWorkflowState';
import { User } from './User';

@Entity('DynamicSubmissionComments')
export class DynamicSubmissionComment {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'SubmissionId', type: 'int', nullable: false })
  submissionId!: number;

  @Column({ name: 'StateId', type: 'int', nullable: false })
  stateId!: number;

  @Column({ name: 'UserId', type: 'int', nullable: false })
  userId!: number;

  @Column({ name: 'Comment', type: 'nvarchar', length: 'max', nullable: false })
  comment!: string;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt!: Date;

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
