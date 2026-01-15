import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany, ManyToOne } from 'typeorm';
import { ProductionRequest } from './ProductionRequest';
import { CampaignProduct } from './CampaignProduct';
import { Objective } from './Objective';

/**
 * CampaignDetail entity representing campaign details for a production request
 */
@Entity('CampaignDetails')
export class CampaignDetail {
    @PrimaryGeneratedColumn({ name: 'Id' })
    id!: number;

    @Column({ name: 'ProductionRequestId', type: 'int', nullable: false, unique: true })
    productionRequestId!: number;

    @OneToOne(() => ProductionRequest, request => request.campaignDetail, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ProductionRequestId' })
    productionRequest!: ProductionRequest;

    @Column({ name: 'Budget', type: 'nvarchar', length: 100, nullable: true })
    budget!: string;

    @Column({ name: 'Brand', type: 'nvarchar', length: 255, nullable: true })
    brand!: string;

    @Column({ name: 'ProductService', type: 'nvarchar', length: 255, nullable: true })
    productService!: string;

    @Column({ name: 'ObjectiveId', type: 'int', nullable: true })
    objectiveId!: number | null;

    @ManyToOne(() => Objective)
    @JoinColumn({ name: 'ObjectiveId' })
    objective!: Objective;

    @OneToMany(() => CampaignProduct, campaignProduct => campaignProduct.campaignDetail, { cascade: true })
    campaignProducts!: CampaignProduct[];
}
