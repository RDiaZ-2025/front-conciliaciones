import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableColumn } from "typeorm";

export class CreateRolesAndRolePermissions1765031600000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create Roles table
        await queryRunner.createTable(new Table({
            name: "Roles",
            columns: [
                {
                    name: "Id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment",
                },
                {
                    name: "Name",
                    type: "varchar",
                    length: "50",
                    isUnique: true,
                },
                {
                    name: "Description",
                    type: "varchar",
                    length: "255",
                    isNullable: true,
                },
            ],
        }), true);

        // Create RolePermissions table (Join Table)
        await queryRunner.createTable(new Table({
            name: "RolePermissions",
            columns: [
                {
                    name: "RoleId",
                    type: "int",
                },
                {
                    name: "PermissionId",
                    type: "int",
                },
            ],
            foreignKeys: [
                {
                    columnNames: ["RoleId"],
                    referencedTableName: "Roles",
                    referencedColumnNames: ["Id"],
                    onDelete: "CASCADE",
                },
                {
                    columnNames: ["PermissionId"],
                    referencedTableName: "Permissions",
                    referencedColumnNames: ["Id"],
                    onDelete: "CASCADE",
                },
            ],
            indices: [
                {
                    columnNames: ["RoleId", "PermissionId"],
                    isUnique: true,
                },
            ],
        }), true);

        // Add RoleId to Users table
        await queryRunner.addColumn("Users", new TableColumn({
            name: "RoleId",
            type: "int",
            isNullable: true,
        }));

        await queryRunner.createForeignKey("Users", new TableForeignKey({
            columnNames: ["RoleId"],
            referencedTableName: "Roles",
            referencedColumnNames: ["Id"],
            onDelete: "SET NULL",
        }));

        // Seed Roles and Permissions
        const roles = [
            { name: 'admin', description: 'Administrador' },
            { name: 'user', description: 'Usuario' },
            { name: 'dashboard_only', description: 'Solo Dashboard' },
            { name: 'full_access', description: 'Acceso Completo' }
        ];

        // Permissions mapping from frontend constants
        const rolePermissions = {
            'admin': [
                'admin_panel',
                'document_upload',
                'management_dashboard',
                'historial_carga_archivos_comerciales',
                'view_history',
                'production_management',
                'manage_menus',
                'portada_15_minutos'
            ],
            'user': [
                'document_upload',
                'view_history'
            ],
            'dashboard_only': [
                'management_dashboard'
            ],
            'full_access': [
                'admin_panel',
                'document_upload',
                'management_dashboard',
                'historial_carga_archivos_comerciales',
                'view_history',
                'production_management',
                'manage_menus',
                'portada_15_minutos'
            ]
        };

        for (const role of roles) {
            await queryRunner.query(`INSERT INTO Roles (Name, Description) VALUES ('${role.name}', '${role.description}')`);
            const roleResult = await queryRunner.query(`SELECT Id FROM Roles WHERE Name = '${role.name}'`);
            const roleId = roleResult[0].Id;
            
            const permissions = rolePermissions[role.name as keyof typeof rolePermissions];
            if (permissions) {
                for (const permName of permissions) {
                    // Ensure permission exists (insert if not) - simple check
                    // Actually, Permissions table should already have these. 
                    // If not, we should probably insert them. But let's assume they exist or just try to select.
                    
                    // We select ID first
                    const permResult = await queryRunner.query(`SELECT Id FROM Permissions WHERE Name = '${permName}'`);
                    let permId;
                    
                    if (permResult && permResult.length > 0) {
                        permId = permResult[0].Id;
                    } else {
                         // Insert if missing
                        await queryRunner.query(`INSERT INTO Permissions (Name, Description, CreatedAt) VALUES ('${permName}', '${permName}', GETDATE())`);
                        const newPermResult = await queryRunner.query(`SELECT Id FROM Permissions WHERE Name = '${permName}'`);
                        permId = newPermResult[0].Id;
                    }

                    await queryRunner.query(`INSERT INTO RolePermissions (RoleId, PermissionId) VALUES (${roleId}, ${permId})`);
                }
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const userTable = await queryRunner.getTable("Users");
        const foreignKey = userTable?.foreignKeys.find(fk => fk.columnNames.indexOf("RoleId") !== -1);
        if (foreignKey) {
            await queryRunner.dropForeignKey("Users", foreignKey);
        }
        await queryRunner.dropColumn("Users", "RoleId");
        await queryRunner.dropTable("RolePermissions");
        await queryRunner.dropTable("Roles");
    }
}
