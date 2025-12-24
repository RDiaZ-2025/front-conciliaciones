import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('Products')
export class Product {
    @PrimaryGeneratedColumn({ name: 'Id' })
    id!: number;

    @Column({ name: 'Name', type: 'nvarchar', length: 255 })
    name!: string;
}
