import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('Covers15Minutes')
export class Cover15Minute {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'nvarchar', length: 'MAX' })
    uploaderLog!: string;

    @Column({ type: 'datetime' })
    timestamp!: Date;

    @Column({ type: 'nvarchar', length: 'MAX' })
    url!: string;
}
