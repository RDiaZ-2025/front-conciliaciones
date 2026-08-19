import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { DynamicForm } from './DynamicForm';
import { DynamicFormFieldValue } from './DynamicFormFieldValue';

@Entity('DynamicFormFields')
export class DynamicFormField {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'FormId', type: 'int', nullable: false })
  formId!: number;

  @Column({ name: 'Name', type: 'nvarchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'Label', type: 'nvarchar', length: 255, nullable: false })
  label!: string;

  @Column({ name: 'Description', type: 'nvarchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ name: 'Type', type: 'nvarchar', length: 50, nullable: false })
  type!: string; // 'text', 'textarea', 'date', 'datetime', 'number', 'select'

  @Column({ name: 'Placeholder', type: 'nvarchar', length: 255, nullable: true })
  placeholder!: string | null;

  @Column({ name: 'IsRequired', type: 'bit', default: false })
  isRequired!: boolean;

  @Column({ name: 'IsReadOnly', type: 'bit', default: false })
  isReadOnly!: boolean;

  @Column({ name: 'IsActive', type: 'bit', default: true })
  isActive!: boolean;

  @Column({ name: 'DefaultValueExpression', type: 'nvarchar', length: 255, nullable: true })
  defaultValueExpression!: string | null; // '{{CURRENT_DATE_TIME}}', '{{LOGGED_USER_NAME}}'

  @Column({ name: 'Metadata', type: 'nvarchar', length: 'max', nullable: true })
  metadata!: string | null;

  @Column({ name: 'DisplayOrder', type: 'int', default: 0 })
  displayOrder!: number;

  @ManyToOne(() => DynamicForm, (form) => form.fields)
  @JoinColumn({ name: 'FormId' })
  form!: DynamicForm;

  @OneToMany(() => DynamicFormFieldValue, (val) => val.field)
  values!: DynamicFormFieldValue[];
}
