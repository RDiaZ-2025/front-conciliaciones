import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { DynamicWorkflow } from './DynamicWorkflow';

/**
 * Team entity representing a team in the system
 * Maps to Teams table in the database
 */
@Entity('Teams')
export class Team {
  /**
   * Primary key - Auto-incrementing team ID
   */
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  /**
   * Name of the team
   */
  @Column({ name: 'Name', type: 'nvarchar', length: 255, nullable: false })
  name!: string;

  /**
   * Description of the team
   */
  @Column({ name: 'Description', type: 'nvarchar', length: 500, nullable: true })
  description!: string | null;

  /**
   * Foreign key to User representing the team leader
   */
  @Column({ name: 'LeaderId', type: 'int', nullable: true })
  leaderId!: number | null;

  /**
   * Foreign key to DynamicWorkflow representing the default workflow for this team
   */
  @Column({ name: 'DefaultWorkflowId', type: 'int', nullable: true })
  defaultWorkflowId!: number | null;

  /**
   * Metadata storing JSON configuration such as enableConditions
   */
  @Column({ name: 'Metadata', type: 'nvarchar', length: 'max', nullable: true })
  metadata!: string | null;

  /**
   * Leader user relationship
   */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'LeaderId' })
  leader?: User | null;

  /**
   * Default workflow relationship
   */
  @ManyToOne(() => DynamicWorkflow, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'DefaultWorkflowId' })
  defaultWorkflow?: DynamicWorkflow | null;

  /**
   * One-to-many relationship with User
   */
  @OneToMany(() => User, user => user.team)
  users!: User[];
}
