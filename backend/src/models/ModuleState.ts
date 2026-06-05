import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('module_states')
export class ModuleState {
    @PrimaryColumn({ name: 'code', type: 'varchar', length: 50 })
    code!: string;

    @Column({ name: 'is_under_maintenance', type: 'bit', default: false })
    isUnderMaintenance!: boolean;

    @Column({ name: 'maintenance_message', type: 'nvarchar', length: 255, nullable: true, default: 'Módulo en mantenimiento' })
    maintenanceMessage!: string | null;

    @Column({ name: 'is_disabled', type: 'bit', default: false })
    isDisabled!: boolean;
}
