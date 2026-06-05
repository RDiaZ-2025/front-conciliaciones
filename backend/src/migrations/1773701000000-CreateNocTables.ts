import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNocTables1773701000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. module_states
        await queryRunner.query(`
            IF OBJECT_ID('module_states', 'U') IS NULL
            BEGIN
                CREATE TABLE module_states (
                    code VARCHAR(50) NOT NULL PRIMARY KEY,
                    is_under_maintenance BIT NOT NULL DEFAULT 0,
                    maintenance_message NVARCHAR(255) NULL DEFAULT N'Módulo en mantenimiento',
                    is_disabled BIT NOT NULL DEFAULT 0
                )
            END
        `);

        // Seed initial module states if the table was empty or newly created
        const existingStates = await queryRunner.query("SELECT COUNT(*) as count FROM module_states");
        if (existingStates && existingStates[0] && existingStates[0].count === 0) {
            await queryRunner.query(`
                INSERT INTO module_states (code, is_under_maintenance, is_disabled) VALUES 
                ('dashboard', 0, 0),
                ('ingresos', 0, 0),
                ('presupuesto', 0, 0),
                ('segmentacion', 0, 0),
                ('analisis', 0, 0)
            `);
        }

        // 2. dashboard_data
        await queryRunner.query(`
            IF OBJECT_ID('dashboard_data', 'U') IS NULL
            BEGIN
                CREATE TABLE dashboard_data (
                    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    rank_seccion INT NULL,
                    mes NVARCHAR(255) NULL,
                    seccion NVARCHAR(255) NULL,
                    fecha_url DATE NULL,
                    clean_url NVARCHAR(255) NULL,
                    titulo_url NVARCHAR(255) NULL,
                    autor NVARCHAR(255) NULL,
                    total_users INT NULL,
                    screen_page_views INT NULL,
                    sessions INT NULL,
                    engaged_sessions INT NULL,
                    tema_principal NVARCHAR(255) NULL,
                    categoria_entidad NVARCHAR(255) NULL,
                    fuente NVARCHAR(255) NULL DEFAULT 'Discover',
                    entidad_principal NVARCHAR(255) NULL,
                    semantic_score FLOAT NULL,
                    syntactic_score FLOAT NULL,
                    analisis_gemini_raw NVARCHAR(MAX) NULL
                )
            END
        `);

        // 3. entities
        await queryRunner.query(`
            IF OBJECT_ID('entities', 'U') IS NULL
            BEGIN
                CREATE TABLE entities (
                    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    dashboard_data_id INT NOT NULL,
                    name NVARCHAR(255) NOT NULL,
                    type NVARCHAR(255) NULL DEFAULT 'Tema',
                    is_principal BIT NOT NULL DEFAULT 0,
                    semantic_score FLOAT NULL,
                    syntactic_score FLOAT NULL,
                    CONSTRAINT FK_entities_dashboard_data FOREIGN KEY (dashboard_data_id) 
                        REFERENCES dashboard_data(id) ON DELETE CASCADE
                )
            END
        `);

        // 4. presupuesto
        await queryRunner.query(`
            IF OBJECT_ID('presupuesto', 'U') IS NULL
            BEGIN
                CREATE TABLE presupuesto (
                    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    Fecha DATE NOT NULL,
                    Seccion NVARCHAR(100) NULL,
                    Fuente NVARCHAR(100) NULL,
                    Ppto FLOAT NULL DEFAULT 0.0,
                    Ejecucion FLOAT NULL DEFAULT 0.0
                )
            END
        `);

        // 5. ingreso_portal
        await queryRunner.query(`
            IF OBJECT_ID('ingreso_portal', 'U') IS NULL
            BEGIN
                CREATE TABLE ingreso_portal (
                    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    Fecha DATE NULL,
                    ImpresionesTotales INT NULL,
                    ImpresionesSinRellenar INT NULL,
                    PromedioAdExchange FLOAT NULL,
                    IngresosAdExchange FLOAT NULL,
                    USD FLOAT NULL,
                    COP INT NULL
                )
            END
        `);

        // 6. ingreso_redes
        await queryRunner.query(`
            IF OBJECT_ID('ingreso_redes', 'U') IS NULL
            BEGIN
                CREATE TABLE ingreso_redes (
                    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    Mes DATE NOT NULL,
                    Plataforma NVARCHAR(50) NOT NULL,
                    TotalBruto FLOAT NULL,
                    Retencion FLOAT NULL,
                    TotalNeto FLOAT NULL,
                    RedMasTv FLOAT NULL,
                    RedMasNoticias FLOAT NULL,
                    QuinceMinutos FLOAT NULL,
                    RadiolaTv FLOAT NULL
                )
            END
        `);

        // 7. precio_dolar
        await queryRunner.query(`
            IF OBJECT_ID('precio_dolar', 'U') IS NULL
            BEGIN
                CREATE TABLE precio_dolar (
                    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    Mes DATE NOT NULL UNIQUE,
                    Precio FLOAT NOT NULL
                )
            END
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS entities`);
        await queryRunner.query(`DROP TABLE IF EXISTS dashboard_data`);
        await queryRunner.query(`DROP TABLE IF EXISTS module_states`);
        await queryRunner.query(`DROP TABLE IF EXISTS presupuesto`);
        await queryRunner.query(`DROP TABLE IF EXISTS ingreso_portal`);
        await queryRunner.query(`DROP TABLE IF EXISTS ingreso_redes`);
        await queryRunner.query(`DROP TABLE IF EXISTS precio_dolar`);
    }

}
