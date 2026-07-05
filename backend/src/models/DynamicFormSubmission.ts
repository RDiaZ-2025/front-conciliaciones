import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { DynamicForm } from './DynamicForm';
import { User } from './User';
import { DynamicWorkflowStage } from './DynamicWorkflowStage';
import { DynamicFormFieldValue } from './DynamicFormFieldValue';
import { DynamicSubmissionWorkflowState } from './DynamicSubmissionWorkflowState';

@Entity('DynamicFormSubmissions')
export class DynamicFormSubmission {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'FormId', type: 'int', nullable: false })
  formId!: number;

  @Column({ name: 'RequesterUserId', type: 'int', nullable: false })
  requesterUserId!: number;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt!: Date;

  @Column({ name: 'CurrentStageId', type: 'int', nullable: true })
  currentStageId!: number | null;

  @Column({ name: 'Status', type: 'nvarchar', length: 50, default: 'Pending' })
  status!: string; // 'Pending', 'In Progress', 'Approved', 'Rejected', 'Completed'

  @Column({ name: 'Consecutive', type: 'nvarchar', length: 100, nullable: true })
  consecutive!: string | null;

  @ManyToOne(() => DynamicForm, (form) => form.submissions)
  @JoinColumn({ name: 'FormId' })
  form!: DynamicForm;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'RequesterUserId' })
  requesterUser!: User;

  @ManyToOne(() => DynamicWorkflowStage)
  @JoinColumn({ name: 'CurrentStageId' })
  currentStage!: DynamicWorkflowStage | null;

  @OneToMany(() => DynamicFormFieldValue, (val) => val.submission)
  values!: DynamicFormFieldValue[];

  @OneToMany(() => DynamicSubmissionWorkflowState, (state) => state.submission)
  workflowStates!: DynamicSubmissionWorkflowState[];
}
