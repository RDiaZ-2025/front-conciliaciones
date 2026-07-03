import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateProductionRequestTypesTable1773950000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "ProductionRequestTypes",
            columns: [
                {
                    name: "Id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "Name",
                    type: "nvarchar",
                    length: "255",
                    isNullable: false
                },
                {
                    name: "Responsible",
                    type: "nvarchar",
                    length: "255",
                    isNullable: false
                },
                {
                    name: "Role",
                    type: "nvarchar",
                    length: "255",
                    isNullable: false
                },
                {
                    name: "Email",
                    type: "nvarchar",
                    length: "255",
                    isNullable: false
                },
                {
                    name: "Phone",
                    type: "nvarchar",
                    length: "50",
                    isNullable: false
                }
            ]
        }), true);

        // Seed the 5 items from the image
        await queryRunner.query(`
            INSERT INTO ProductionRequestTypes (Name, Responsible, Role, Email, Phone) VALUES
            ('CONTENT MARKETING', 'Luisa Fajardo', 'Jefe Preventa', 'luisa.fajardoro@claro.com.co', '+3102266514'),
            ('DATA', 'Carlos Ospina', 'Líder de Data y Research', 'carlos.ospina.ext@claro.com.co', '+573016791135'),
            ('ESTRATEGIA Y PRODUCCIÓN', 'Camila García', 'Líder de Estrategia', 'maria.garciaf.ext@claro.com.co', '+573045231396'),
            ('IMPLEMENTACIÓN DE CAMPAÑAS', 'Daniel Castañeda', 'Líder de Operaciones', 'daniel.castaneda@redmasnoticias.com', '+573178954075'),
            ('TRÁFICO CALIFICADO', 'María Paula López', 'Jefe de Posventa', 'maria.lopezl@claro.com.co', '+573204456724')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("ProductionRequestTypes");
    }

}
