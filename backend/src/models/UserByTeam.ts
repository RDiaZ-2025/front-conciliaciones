import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { User } from './User';
import { Team } from './Team';

/**
 * UserByTeam entity representing the many-to-many relationship between users and teams
 * Maps to UserByTeam table in the database
 */
@Entity('UserByTeam')
@Unique(['userId', 'teamId'])
@Index('IX_UserByTeam_UserId', ['userId'])
@Index('IX_UserByTeam_TeamId', ['teamId'])
export class UserByTeam {
  /**
   * Primary key - Auto-incrementing ID
   */
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  /**
   * Foreign key to User table
   */
  @Column({ name: 'UserId', type: 'int', nullable: false })
  userId!: number;

  /**
   * Foreign key to Team table
   */
  @Column({ name: 'TeamId', type: 'int', nullable: false })
  teamId!: number;

  /**
   * Many-to-one relationship with User
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'UserId' })
  user!: User;

  /**
   * Many-to-one relationship with Team
   */
  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'TeamId' })
  team!: Team;
}
