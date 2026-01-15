import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { ProductionRequest } from './ProductionRequest';
import { FormatType } from './FormatType';
import { RightsDuration } from './RightsDuration';

/**
 * ProductionInfo entity representing production specifics for a production request
 */
@Entity('ProductionInfo')
export class ProductionInfo {
    @PrimaryGeneratedColumn({ name: 'Id' })
    id!: number;

    @Column({ name: 'ProductionRequestId', type: 'int', nullable: false, unique: true })
    productionRequestId!: number;

    @OneToOne(() => ProductionRequest, request => request.productionInfo, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ProductionRequestId' })
    productionRequest!: ProductionRequest;

    @Column({ name: 'FormatTypeId', type: 'int', nullable: true })
    formatTypeId!: number | null;

    @ManyToOne(() => FormatType)
    @JoinColumn({ name: 'FormatTypeId' })
    formatType!: FormatType;

    @Column({ name: 'RightsDurationId', type: 'int', nullable: true })
    rightsDurationId!: number | null;

    @ManyToOne(() => RightsDuration)
    @JoinColumn({ name: 'RightsDurationId' })
    rightsDuration!: RightsDuration;

    @Column({ name: 'CampaignEmissionDate', type: 'datetime', nullable: true })
    campaignEmissionDate!: Date;

    @Column({ name: 'CommunicationTone', type: 'nvarchar', length: 255, nullable: true })
    communicationTone!: string;

    @Column({ name: 'OwnAndExternalMedia', type: 'nvarchar', length: 'MAX', nullable: true })
    ownAndExternalMedia!: string;

    @Column({ name: 'TvFormats', type: 'nvarchar', length: 'MAX', nullable: true })
    tvFormats!: string;

    @Column({ name: 'DigitalFormats', type: 'nvarchar', length: 'MAX', nullable: true })
    digitalFormats!: string;

    @Column({ name: 'ProductionDetails', type: 'nvarchar', length: 'MAX', nullable: true })
    productionDetails!: string;

    @Column({ name: 'AdditionalComments', type: 'nvarchar', length: 'MAX', nullable: true })
    additionalComments!: string;
}
