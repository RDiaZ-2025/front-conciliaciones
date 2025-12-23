import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { User } from './User';
import { CustomerData } from './CustomerData';
import { CampaignDetail } from './CampaignDetail';
import { AudienceData } from './AudienceData';
import { ProductionInfo } from './ProductionInfo';

/**
 * ProductionRequest entity representing production request management
 * Maps to ProductionRequests table in the database
 */
@Entity('ProductionRequests')
@Index('IX_ProductionRequests_RequestDate', ['requestDate'])
@Index('IX_ProductionRequests_Stage', ['stage'])
export class ProductionRequest {
  /**
   * Primary key - Auto-incrementing production request ID
   */
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  /**
   * Name/title of the production request
   */
  @Column({ name: 'Name', type: 'nvarchar', length: 255, nullable: false })
  name!: string;

  /**
   * Date when the request was made
   */
  @Column({ name: 'RequestDate', type: 'datetime', nullable: false })
  requestDate!: Date;

  /**
   * Department that made the request
   */
  @Column({ name: 'Department', type: 'nvarchar', length: 255, nullable: false })
  department!: string;

  /**
   * Contact person for this request
   */
  @Column({ name: 'ContactPerson', type: 'nvarchar', length: 255, nullable: false })
  contactPerson!: string;

  /**
   * Team assigned to handle this request
   */
  @Column({ name: 'AssignedTeam', type: 'nvarchar', length: 255, nullable: false })
  assignedTeam!: string;

  /**
   * User assigned to handle this request
   */
  @Column({ name: 'AssignedUserId', type: 'int', nullable: true })
  assignedUserId!: number | null;

  /**
   * Relationship with User entity
   */
  @ManyToOne(() => User)
  @JoinColumn({ name: 'AssignedUserId' })
  assignedUser!: User;

  /**
   * One-to-one relationship with CustomerData
   */
  @OneToOne(() => CustomerData, customerData => customerData.productionRequest, { cascade: true })
  customerData!: CustomerData;

  /**
   * One-to-one relationship with CampaignDetail
   */
  @OneToOne(() => CampaignDetail, campaignDetail => campaignDetail.productionRequest, { cascade: true })
  campaignDetail!: CampaignDetail;

  /**
   * One-to-one relationship with AudienceData
   */
  @OneToOne(() => AudienceData, audienceData => audienceData.productionRequest, { cascade: true })
  audienceData!: AudienceData;

  /**
   * One-to-one relationship with ProductionInfo
   */
  @OneToOne(() => ProductionInfo, productionInfo => productionInfo.productionRequest, { cascade: true })
  productionInfo!: ProductionInfo;

  /**
   * Expected or actual delivery date
   */
  @Column({ name: 'DeliveryDate', type: 'datetime', nullable: true })
  deliveryDate!: Date | null;

  /**
   * Additional observations or notes
   */
  @Column({ name: 'Observations', type: 'nvarchar', length: 'MAX', nullable: true })
  observations!: string | null;

  /**
   * Current stage of the production request
   * Possible values: 'request', 'in_progress', 'review', 'completed', 'cancelled'
   */
  @Column({ name: 'Stage', type: 'nvarchar', length: 50, nullable: false, default: 'request' })
  stage!: string;

  /**
   * Check if request is in initial stage
   */
  isInRequestStage(): boolean {
    return this.stage === 'request';
  }

  /**
   * Check if request is in progress
   */
  isInProgress(): boolean {
    return this.stage === 'in_progress';
  }

  /**
   * Check if request is under review
   */
  isUnderReview(): boolean {
    return this.stage === 'review';
  }

  /**
   * Check if request is completed
   */
  isCompleted(): boolean {
    return this.stage === 'completed';
  }

  /**
   * Check if request is cancelled
   */
  isCancelled(): boolean {
    return this.stage === 'cancelled';
  }

  /**
   * Check if request is overdue (past delivery date)
   */
  isOverdue(): boolean {
    if (!this.deliveryDate || this.isCompleted() || this.isCancelled()) {
      return false;
    }
    return new Date() > this.deliveryDate;
  }

  /**
   * Get days until delivery (negative if overdue)
   */
  getDaysUntilDelivery(): number | null {
    if (!this.deliveryDate) {
      return null;
    }

    const now = new Date();
    const diffTime = this.deliveryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get human-readable stage display
   */
  getStageDisplay(): string {
    switch (this.stage) {
      case 'request':
        return 'Solicitud';
      case 'in_progress':
        return 'En Progreso';
      case 'review':
        return 'En Revisión';
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Desconocido';
    }
  }

  /**
   * Get priority level based on delivery date
   */
  getPriorityLevel(): 'high' | 'medium' | 'low' {
    const daysUntilDelivery = this.getDaysUntilDelivery();

    if (daysUntilDelivery === null) {
      return 'low';
    }

    if (daysUntilDelivery < 0) {
      return 'high'; // Overdue
    }

    if (daysUntilDelivery <= 3) {
      return 'high';
    }

    if (daysUntilDelivery <= 7) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Get request age in days
   */
  getRequestAgeInDays(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.requestDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Advance to next stage
   */
  advanceStage(): void {
    switch (this.stage) {
      case 'request':
        this.stage = 'in_progress';
        break;
      case 'in_progress':
        this.stage = 'review';
        break;
      case 'review':
        this.stage = 'completed';
        break;
    }
  }

  /**
   * Cancel the request
   */
  cancel(): void {
    this.stage = 'cancelled';
  }
}