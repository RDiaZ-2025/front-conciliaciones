import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

/**
 * LoadDocumentsOCbyUser entity representing document loading tracking
 * Maps to LoadDocumentsOcByUser table in the database
 */
@Entity('LoadDocumentsOcByUser')
export class LoadDocumentsOCbyUser {
  /**
   * Primary key - Auto-incrementing ID
   */
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  /**
   * Foreign key to User table
   */
  @Column({ name: 'IdUser', type: 'int', nullable: false })
  idUser!: number;

  /**
   * Unique identifier for the folder/container where document is stored
   */
  @Column({ name: 'IdFolder', type: 'uniqueidentifier', nullable: false })
  idFolder!: string;

  /**
   * Date and time when document was loaded
   */
  @CreateDateColumn({ name: 'Fecha', type: 'datetime' })
  fecha!: Date;

  /**
   * Status of the document loading process
   * Examples: 'pending', 'processing', 'completed', 'failed'
   */
  @Column({ name: 'Status', type: 'varchar', length: 50, nullable: true })
  status!: string | null;

  /**
   * Original filename of the uploaded document
   */
  @Column({ name: 'FileName', type: 'varchar', length: 255, nullable: false })
  fileName!: string;

  /**
   * Many-to-one relationship with User
   */
  @ManyToOne(() => User, user => user.documentLoads)
  @JoinColumn({ name: 'IdUser' })
  user!: User;

  /**
   * Check if document loading is completed
   */
  isCompleted(): boolean {
    return this.status === 'completed';
  }

  /**
   * Check if document loading failed
   */
  isFailed(): boolean {
    return this.status === 'failed';
  }

  /**
   * Check if document loading is in progress
   */
  isInProgress(): boolean {
    return this.status === 'processing' || this.status === 'pending';
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(): string {
    return this.fileName.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Check if file is a PDF
   */
  isPdfFile(): boolean {
    return this.getFileExtension() === 'pdf';
  }

  /**
   * Check if file is an Excel file
   */
  isExcelFile(): boolean {
    const extension = this.getFileExtension();
    return extension === 'xlsx' || extension === 'xls';
  }

  /**
   * Get human-readable status
   */
  getStatusDisplay(): string {
    switch (this.status) {
      case 'pending':
        return 'Pendiente';
      case 'processing':
        return 'Procesando';
      case 'completed':
        return 'Completado';
      case 'failed':
        return 'Fallido';
      default:
        return 'Desconocido';
    }
  }
}