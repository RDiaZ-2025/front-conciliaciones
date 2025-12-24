import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CampaignDetail } from './CampaignDetail';
import { Product } from './Product';

@Entity('CampaignProducts')
export class CampaignProduct {
    @PrimaryGeneratedColumn({ name: 'Id' })
    id!: number;

    @Column({ name: 'CampaignDetailId', type: 'int' })
    campaignDetailId!: number;

    @Column({ name: 'ProductId', type: 'int' })
    productId!: number;

    @Column({ name: 'Quantity', type: 'nvarchar', length: 50 })
    quantity!: string;

    @ManyToOne(() => CampaignDetail, campaignDetail => campaignDetail.campaignProducts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'CampaignDetailId' })
    campaignDetail!: CampaignDetail;

    @ManyToOne(() => Product)
    @JoinColumn({ name: 'ProductId' })
    product!: Product;
}
