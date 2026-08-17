import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { DynamicFormSubmission } from './DynamicFormSubmission';
import { DynamicFormField } from './DynamicFormField';
import { DynamicSubmissionWorkflowState } from './DynamicSubmissionWorkflowState';

@Entity('DynamicFormFieldValues')
export class DynamicFormFieldValue {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'SubmissionId', type: 'int', nullable: false })
  submissionId!: number;

  @Column({ name: 'FieldId', type: 'int', nullable: false })
  fieldId!: number;

  @Column({ name: 'Value', type: 'nvarchar', length: 'max', nullable: true })
  value!: string | null;

  @Column({ name: 'WorkflowStateId', type: 'int', nullable: true })
  workflowStateId!: number | null;

  @ManyToOne(() => DynamicFormSubmission, (sub) => sub.values)
  @JoinColumn({ name: 'SubmissionId' })
  submission!: DynamicFormSubmission;

  @ManyToOne(() => DynamicFormField, (field) => field.values)
  @JoinColumn({ name: 'FieldId' })
  field!: DynamicFormField;

  @ManyToOne(() => DynamicSubmissionWorkflowState)
  @JoinColumn({ name: 'WorkflowStateId' })
  workflowState!: DynamicSubmissionWorkflowState | null;
}
