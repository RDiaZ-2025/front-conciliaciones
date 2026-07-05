import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { DynamicFormField } from './DynamicFormField';
import { DynamicFormSubmission } from './DynamicFormSubmission';
import { DynamicWorkflowStage } from './DynamicWorkflowStage';

@Entity('DynamicForms')
export class DynamicForm {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'Name', type: 'nvarchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'Description', type: 'nvarchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ name: 'IsEntryForm', type: 'bit', default: false })
  isEntryForm!: boolean;

  @Column({ name: 'IsActive', type: 'bit', default: true })
  isActive!: boolean;

  @Column({ name: 'RequireConsecutive', type: 'bit', default: true })
  requireConsecutive!: boolean;

  @Column({ name: 'Responsible', type: 'nvarchar', length: 255, nullable: true })
  responsible!: string | null;

  @Column({ name: 'Icon', type: 'nvarchar', length: 255, nullable: true })
  icon!: string | null;

  @Column({ name: 'Role', type: 'nvarchar', length: 255, nullable: true })
  role!: string | null;

  @OneToMany(() => DynamicFormField, (field) => field.form)
  fields!: DynamicFormField[];

  @OneToMany(() => DynamicFormSubmission, (submission) => submission.form)
  submissions!: DynamicFormSubmission[];

  @OneToMany(() => DynamicWorkflowStage, (stage) => stage.form)
  stages!: DynamicWorkflowStage[];
}
