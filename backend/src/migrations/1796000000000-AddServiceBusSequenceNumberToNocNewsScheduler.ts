import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddServiceBusSequenceNumberToNocNewsScheduler1796000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('noc_news_scheduler');
        if (table && !table.findColumnByName('serviceBusSequenceNumber')) {
            await queryRunner.addColumn('noc_news_scheduler', new TableColumn({
                name: 'serviceBusSequenceNumber',
                type: 'nvarchar',
                length: '50',
                isNullable: true
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('noc_news_scheduler');
        if (table && table.findColumnByName('serviceBusSequenceNumber')) {
            await queryRunner.dropColumn('noc_news_scheduler', 'serviceBusSequenceNumber');
        }
    }
}
