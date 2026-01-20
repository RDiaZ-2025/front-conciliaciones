import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { User } from './User';
import { CustomerData } from './CustomerData';
import { CampaignDetail } from './CampaignDetail';
import { AudienceData } from './AudienceData';
import { ProductionInfo } from './ProductionInfo';
import { Status } from './Status';

/**
 * ProductionRequest entity representing production request management
 * Maps to ProductionRequests table in the database
 */
@Entity('ProductionRequests')
@Index('IX_ProductionRequests_RequestDate', ['requestDate'])
@Index('IX_ProductionRequests_Stage', ['stage'])
export class ProductionRequest {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'Name', type: 'nvarchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'RequestDate', type: 'datetime', nullable: false })
  requestDate!: Date;

  @Column({ name: 'Department', type: 'nvarchar', length: 255, nullable: false })
  department!: string;

  @Column({ name: 'ContactPerson', type: 'nvarchar', length: 255, nullable: false })
  contactPerson!: string;

  @Column({ name: 'AssignedTeam', type: 'nvarchar', length: 255, nullable: false })
  assignedTeam!: string;

  @Column({ name: 'AssignedUserId', type: 'int', nullable: true })
  assignedUserId!: number | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'AssignedUserId' })
  assignedUser!: User;

  @Column({ name: 'StatusId', type: 'int', nullable: true })
  statusId!: number | null;

  @ManyToOne(() => Status)
  @JoinColumn({ name: 'StatusId' })
  status!: Status;

  @OneToOne(() => CustomerData, customerData => customerData.productionRequest, { cascade: true })
  customerData!: CustomerData;

  @OneToOne(() => CampaignDetail, campaignDetail => campaignDetail.productionRequest, { cascade: true })
  campaignDetail!: CampaignDetail;

  @OneToOne(() => AudienceData, audienceData => audienceData.productionRequest, { cascade: true })
  audienceData!: AudienceData;

  @OneToOne(() => ProductionInfo, productionInfo => productionInfo.productionRequest, { cascade: true })
  productionInfo!: ProductionInfo;

  @Column({ name: 'DeliveryDate', type: 'datetime', nullable: true })
  deliveryDate!: Date | null;

  @Column({ name: 'Observations', type: 'nvarchar', length: 'MAX', nullable: true })
  observations!: string | null;

  @Column({ name: 'Stage', type: 'nvarchar', length: 50, nullable: false, default: 'request' })
  stage!: string;

  isInRequestStage(): boolean {
    return this.stage === 'request';
  }

  isInProgress(): boolean {
    return this.stage === 'in_progress';
  }

  isUnderReview(): boolean {
    return this.stage === 'review';
  }

  isCompleted(): boolean {
    return this.stage === 'completed';
  }

  isCancelled(): boolean {
    return this.stage === 'cancelled';
  }

  isOverdue(): boolean {
    if (!this.deliveryDate || this.isCompleted() || this.isCancelled()) {
      return false;
    }
    return new Date() > this.deliveryDate;
  }

  getDaysUntilDelivery(): number | null {
    if (!this.deliveryDate) {
      return null;
    }

    const now = new Date();
    const diffTime = this.deliveryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

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

  getPriorityLevel(): 'high' | 'medium' | 'low' {
    const daysUntilDelivery = this.getDaysUntilDelivery();

    if (daysUntilDelivery === null) {
      return 'low';
    }

    if (daysUntilDelivery < 0) {
      return 'high';
    }

    if (daysUntilDelivery <= 3) {
      return 'high';
    }

    if (daysUntilDelivery <= 7) {
      return 'medium';
    }

    return 'low';
  }

  getRequestAgeInDays(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.requestDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

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

  cancel(): void {
    this.stage = 'cancelled';
  }
}