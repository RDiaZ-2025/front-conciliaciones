import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { DynamicWorkflowStage } from './DynamicWorkflowStage';

@Entity('DynamicWorkflows')
export class DynamicWorkflow {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'Name', type: 'nvarchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'Description', type: 'nvarchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ name: 'RequireConsecutive', type: 'bit', default: true })
  requireConsecutive!: boolean;

  @Column({ name: 'IsActive', type: 'bit', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'CreatedAt' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'UpdatedAt' })
  updatedAt!: Date;

  @OneToMany(() => DynamicWorkflowStage, (stage) => stage.workflow)
  stages!: DynamicWorkflowStage[];
}
