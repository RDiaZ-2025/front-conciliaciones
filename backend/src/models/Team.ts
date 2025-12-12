import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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
}
