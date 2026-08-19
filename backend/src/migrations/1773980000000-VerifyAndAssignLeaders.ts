import { MigrationInterface, QueryRunner } from "typeorm";

export class VerifyAndAssignLeaders1773980000000 implements MigrationInterface {
    name = 'VerifyAndAssignLeaders1773980000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const passwordHash = '$2b$12$ZYrHcJdbEQUMgqlPcqzwUu3E3Nrz8m0OPI7FTXTBltepUC4NJAjXq';

        // 1. Ensure Luisa Fajardo exists
        await queryRunner.query(`
            IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'luisa.fajardoro@claro.com.co')
            BEGIN
                INSERT INTO Users (Name, Email, PasswordHash, Status, Role, Permissions) 
                VALUES ('Luisa Fajardo', 'luisa.fajardoro@claro.com.co', '${passwordHash}', 1, 'user', '');
            END
            ELSE
            BEGIN
                UPDATE Users SET Name = 'Luisa Fajardo', Status = 1 WHERE Email = 'luisa.fajardoro@claro.com.co';
            END
        `);

        // 2. Ensure Carlos Ospina exists
        await queryRunner.query(`
            IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'carlos.ospina.ext@claro.com.co')
            BEGIN
                INSERT INTO Users (Name, Email, PasswordHash, Status, Role, Permissions) 
                VALUES ('Carlos Ospina', 'carlos.ospina.ext@claro.com.co', '${passwordHash}', 1, 'user', '');
            END
            ELSE
            BEGIN
                UPDATE Users SET Name = 'Carlos Ospina', Status = 1 WHERE Email = 'carlos.ospina.ext@claro.com.co';
            END
        `);

        // 3. Ensure Camila García exists (updating name if it resolved to maria.garciaf.ext@claro.com.co)
        await queryRunner.query(`
            IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'maria.garciaf.ext@claro.com.co')
            BEGIN
                INSERT INTO Users (Name, Email, PasswordHash, Status, Role, Permissions) 
                VALUES ('Camila García', 'maria.garciaf.ext@claro.com.co', '${passwordHash}', 1, 'user', '');
            END
            ELSE
            BEGIN
                UPDATE Users SET Name = 'Camila García', Status = 1 WHERE Email = 'maria.garciaf.ext@claro.com.co';
            END
        `);

        // 4. Ensure Daniel Castañeda exists
        await queryRunner.query(`
            IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'daniel.castaneda@redmasnoticias.com')
            BEGIN
                INSERT INTO Users (Name, Email, PasswordHash, Status, Role, Permissions) 
                VALUES ('Daniel Castañeda', 'daniel.castaneda@redmasnoticias.com', '${passwordHash}', 1, 'user', '');
            END
            ELSE
            BEGIN
                UPDATE Users SET Name = 'Daniel Castañeda', Status = 1 WHERE Email = 'daniel.castaneda@redmasnoticias.com';
            END
        `);

        // 5. Ensure María Paula López exists
        await queryRunner.query(`
            IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'maria.lopezl@claro.com.co')
            BEGIN
                INSERT INTO Users (Name, Email, PasswordHash, Status, Role, Permissions) 
                VALUES ('María Paula López', 'maria.lopezl@claro.com.co', '${passwordHash}', 1, 'user', '');
            END
            ELSE
            BEGIN
                UPDATE Users SET Name = 'María Paula López', Status = 1 WHERE Email = 'maria.lopezl@claro.com.co';
            END
        `);

        // 6. Update DynamicForms table to match the leader info from screenshot
        await queryRunner.query(`
            UPDATE DynamicForms SET Responsible = 'Luisa Fajardo', Role = 'Jefe Preventa' WHERE Name = 'CONTENT MARKETING';
            UPDATE DynamicForms SET Responsible = 'Carlos Ospina', Role = 'Líder de Data y Research' WHERE Name = 'DATA';
            UPDATE DynamicForms SET Responsible = 'Camila García', Role = 'Líder de Estrategia' WHERE Name = 'ESTRATEGIA Y PRODUCCIÓN';
            UPDATE DynamicForms SET Responsible = 'Daniel Castañeda', Role = 'Líder de Operaciones' WHERE Name = 'IMPLEMENTACIÓN DE CAMPAÑAS';
            UPDATE DynamicForms SET Responsible = 'María Paula López', Role = 'Jefe de Posventa' WHERE Name = 'TRÁFICO CALIFICADO';
        `);

        // 7. Update DynamicWorkflowStages to match AssigneeUserId of the correct leaders
        await queryRunner.query(`
            DECLARE @LuisaId INT = (SELECT TOP 1 Id FROM Users WHERE Email = 'luisa.fajardoro@claro.com.co');
            DECLARE @CarlosId INT = (SELECT TOP 1 Id FROM Users WHERE Email = 'carlos.ospina.ext@claro.com.co');
            DECLARE @CamilaId INT = (SELECT TOP 1 Id FROM Users WHERE Email = 'maria.garciaf.ext@claro.com.co');
            DECLARE @DanielId INT = (SELECT TOP 1 Id FROM Users WHERE Email = 'daniel.castaneda@redmasnoticias.com');
            DECLARE @MariaId INT = (SELECT TOP 1 Id FROM Users WHERE Email = 'maria.lopezl@claro.com.co');

            DECLARE @Form1Id INT = (SELECT TOP 1 Id FROM DynamicForms WHERE Name = 'CONTENT MARKETING');
            DECLARE @Form2Id INT = (SELECT TOP 1 Id FROM DynamicForms WHERE Name = 'DATA');
            DECLARE @Form3Id INT = (SELECT TOP 1 Id FROM DynamicForms WHERE Name = 'ESTRATEGIA Y PRODUCCIÓN');
            DECLARE @Form4Id INT = (SELECT TOP 1 Id FROM DynamicForms WHERE Name = 'IMPLEMENTACIÓN DE CAMPAÑAS');
            DECLARE @Form5Id INT = (SELECT TOP 1 Id FROM DynamicForms WHERE Name = 'TRÁFICO CALIFICADO');

            UPDATE DynamicWorkflowStages SET AssigneeUserId = @LuisaId WHERE FormId = @Form1Id AND StepOrder = 1;
            UPDATE DynamicWorkflowStages SET AssigneeUserId = @CarlosId WHERE FormId = @Form2Id AND StepOrder = 1;
            UPDATE DynamicWorkflowStages SET AssigneeUserId = @CamilaId WHERE FormId = @Form3Id AND StepOrder = 1;
            UPDATE DynamicWorkflowStages SET AssigneeUserId = @DanielId WHERE FormId = @Form4Id AND StepOrder = 1;
            UPDATE DynamicWorkflowStages SET AssigneeUserId = @MariaId WHERE FormId = @Form5Id AND StepOrder = 1;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Nothing to revert, data synchronization only
    }
}
