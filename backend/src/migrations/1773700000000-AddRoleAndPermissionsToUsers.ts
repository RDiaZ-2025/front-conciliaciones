import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddRoleAndPermissionsToUsers1773700000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.addColumn("Users", new TableColumn({
            name: "Role",
            type: "nvarchar",
            length: "255",
            isNullable: true,
            default: "'user'"
        }));

        await queryRunner.addColumn("Users", new TableColumn({
            name: "Permissions",
            type: "nvarchar",
            length: "500",
            isNullable: true,
            default: "''"
        }));

        const permissions = [
            { name: 'dashboard', description: 'Acceso al Dashboard de NOC' },
            { name: 'ingresos', description: 'Acceso a los Ingresos de NOC' },
            { name: 'presupuesto', description: 'Acceso al Presupuesto de NOC' },
            { name: 'segmentacion', description: 'Acceso a Segmentación de Mensajería' },
            { name: 'analisis', description: 'Acceso a Análisis de Mensajería' }
        ];

        for (const perm of permissions) {

            const existing = await queryRunner.query(
                `SELECT * FROM Permissions WHERE Name = '${perm.name}'`
            );

            if (!existing || existing.length === 0) {
                await queryRunner.query(
                    `INSERT INTO Permissions (Name, Description, CreatedAt) VALUES ('${perm.name}', '${perm.description}', GETDATE())`
                );
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(
            `DELETE FROM Permissions WHERE Name IN ('dashboard', 'ingresos', 'presupuesto', 'segmentacion', 'analisis')`
        );

        await queryRunner.dropColumn("Users", "Role");
        await queryRunner.dropColumn("Users", "Permissions");
    }

}
