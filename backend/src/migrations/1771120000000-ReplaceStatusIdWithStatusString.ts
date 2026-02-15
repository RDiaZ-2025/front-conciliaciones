import { MigrationInterface, QueryRunner } from "typeorm";

export class ReplaceStatusIdWithStatusString1771120000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Add Status column
        await queryRunner.query(`ALTER TABLE "ProductionRequests" ADD "Status" nvarchar(50)`);

        // 2. Populate Status column from Statuses table
        // We use a safe update approach.
        await queryRunner.query(`
            UPDATE pr
            SET pr."Status" = s."Code"
            FROM "ProductionRequests" pr
            INNER JOIN "Statuses" s ON pr."StatusId" = s."Id"
        `);
        
        // Default fallback for any rows that didn't match (shouldn't happen if FK integrity existed) or were null
        await queryRunner.query(`UPDATE "ProductionRequests" SET "Status" = 'request' WHERE "Status" IS NULL`);

        // 3. Drop Foreign Key constraint
        // Find and drop the FK constraint on StatusId
        await queryRunner.query(`
            DECLARE @ConstraintName nvarchar(200)
            SELECT @ConstraintName = Name FROM sys.foreign_keys 
            WHERE parent_object_id = OBJECT_ID('ProductionRequests') 
            AND referenced_object_id = OBJECT_ID('Statuses')
            
            IF @ConstraintName IS NOT NULL
            EXEC('ALTER TABLE "ProductionRequests" DROP CONSTRAINT ' + @ConstraintName)
        `);

        // Also check for default constraints on StatusId if any (unlikely for a FK column usually, but good practice)
        await queryRunner.query(`
            DECLARE @ConstraintName nvarchar(200)
            SELECT @ConstraintName = Name FROM sys.default_constraints
            WHERE parent_object_id = OBJECT_ID('ProductionRequests')
            AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('ProductionRequests'), 'StatusId', 'ColumnId')

            IF @ConstraintName IS NOT NULL
            EXEC('ALTER TABLE "ProductionRequests" DROP CONSTRAINT ' + @ConstraintName)
        `);

        // 4. Drop StatusId column
        await queryRunner.query(`ALTER TABLE "ProductionRequests" DROP COLUMN "StatusId"`);

        // 5. Drop Statuses table
        await queryRunner.query(`DROP TABLE "Statuses"`);
        
        // 6. Make Status not null
        await queryRunner.query(`ALTER TABLE "ProductionRequests" ALTER COLUMN "Status" nvarchar(50) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Not implemented as per instructions to just "remove" and "replace".
        // Reverting this destructive change is complex.
    }
}
