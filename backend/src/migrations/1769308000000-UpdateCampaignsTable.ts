import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateCampaignsTable1769308000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if Campaigns table exists
        const tableExists = await queryRunner.query(`
            SELECT * FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'dbo' 
            AND TABLE_NAME = 'Campaigns'
        `);

        if (tableExists.length === 0) {
            // Create table if it doesn't exist
            await queryRunner.query(`
                CREATE TABLE Campaigns (
                    Id int IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    Name nvarchar(255) NOT NULL,
                    TeamId int NOT NULL,
                    Slot nvarchar(100) NOT NULL,
                    Copy nvarchar(500) NOT NULL,
                    Url nvarchar(MAX) NOT NULL,
                    StartDate datetime NOT NULL,
                    EndDate datetime NOT NULL,
                    Impacts nvarchar(MAX),
                    CreatedBy int,
                    CreatedAt datetime DEFAULT GETDATE(),
                    UpdatedAt datetime DEFAULT GETDATE(),
                    CONSTRAINT FK_Campaigns_Team FOREIGN KEY (TeamId) REFERENCES Teams(Id),
                    CONSTRAINT FK_Campaigns_User FOREIGN KEY (CreatedBy) REFERENCES Users(Id)
                )
            `);
        } else {
            // Table exists, check and add missing columns
            const columns = [
                { name: 'Name', type: 'nvarchar(255)', default: "''" },
                { name: 'TeamId', type: 'int', default: '0' }, // Assuming Team 0 or handling constraint later
                { name: 'Slot', type: 'nvarchar(100)', default: "''" },
                { name: 'Copy', type: 'nvarchar(500)', default: "''" },
                { name: 'Url', type: 'nvarchar(MAX)', default: "''" },
                { name: 'StartDate', type: 'datetime', default: 'GETDATE()' },
                { name: 'EndDate', type: 'datetime', default: 'GETDATE()' },
                { name: 'Impacts', type: 'nvarchar(MAX)', default: 'NULL' },
                { name: 'CreatedBy', type: 'int', default: 'NULL' },
                { name: 'CreatedAt', type: 'datetime', default: 'GETDATE()' },
                { name: 'UpdatedAt', type: 'datetime', default: 'GETDATE()' }
            ];

            for (const col of columns) {
                const colExists = await queryRunner.query(`
                    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'Campaigns' 
                    AND COLUMN_NAME = '${col.name}'
                `);

                if (colExists.length === 0) {
                    let query = `ALTER TABLE Campaigns ADD ${col.name} ${col.type}`;
                    if (col.default !== 'NULL') {
                        query += ` NOT NULL DEFAULT ${col.default}`;
                    }
                    await queryRunner.query(query);
                }
            }
            
            // Add FK for TeamId if not exists (Basic check)
            // Note: This might fail if column TeamId existed but FK didn't, and data is invalid.
            // Skipping complex FK checks for now to avoid migration failure on existing data.
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Do nothing to preserve data
    }
}
