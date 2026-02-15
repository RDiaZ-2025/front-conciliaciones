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

  @Column({ name: 'AssignedUserId', type: 'int', nullable: true })
  assignedUserId!: number | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'AssignedUserId' })
  assignedUser!: User;

  @Column({ name: 'Status', type: 'nvarchar', length: 50, nullable: false })
  status!: string;

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

  isInRequestStage(): boolean {
    return (this.status ?? '').toLowerCase() === 'request';
  }

  isInProgress(): boolean {
    return (this.status ?? '').toLowerCase() === 'in_progress';
  }

  isUnderReview(): boolean {
    return (this.status ?? '').toLowerCase() === 'review';
  }

  isCompleted(): boolean {
    return (this.status ?? '').toLowerCase() === 'completed';
  }

  isCancelled(): boolean {
    return (this.status ?? '').toLowerCase() === 'cancelled';
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
    const code = (this.status ?? '').toLowerCase();
    switch (code) {
      case 'request':
        return 'Solicitud';
      case 'in_sell':
        return 'En Venta';
      case 'get_data':
        return 'Obtener Datos';
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
}
