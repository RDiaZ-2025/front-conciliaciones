import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { DynamicWorkflow } from './DynamicWorkflow';

@Entity('Teams')
export class Team {

  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'Name', type: 'nvarchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'Description', type: 'nvarchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ name: 'LeaderId', type: 'int', nullable: true })
  leaderId!: number | null;

  @Column({ name: 'DefaultWorkflowId', type: 'int', nullable: true })
  defaultWorkflowId!: number | null;

  @Column({ name: 'Metadata', type: 'nvarchar', length: 'max', nullable: true })
  metadata!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'LeaderId' })
  leader?: User | null;

  @ManyToOne(() => DynamicWorkflow, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'DefaultWorkflowId' })
  defaultWorkflow?: DynamicWorkflow | null;

  @OneToMany(() => User, user => user.team)
  users!: User[];
}
