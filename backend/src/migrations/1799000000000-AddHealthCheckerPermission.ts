import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHealthCheckerPermission1799000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const existing = await queryRunner.query(
            `SELECT * FROM Permissions WHERE Name = 'health_checker'`
        );

        if (!existing || existing.length === 0) {
            await queryRunner.query(
                `INSERT INTO Permissions (Name, Description, CreatedAt) VALUES ('health_checker', 'Monitor de Salud del Sistema (Health Check)', GETDATE())`
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM Permissions WHERE Name = 'health_checker'`
        );
    }

}
