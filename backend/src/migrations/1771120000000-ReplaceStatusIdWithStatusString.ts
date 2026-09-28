import { MigrationInterface, QueryRunner } from "typeorm";

export class ReplaceStatusIdWithStatusString1771120000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`ALTER TABLE "ProductionRequests" ADD "Status" nvarchar(50)`);

        await queryRunner.query(`
            UPDATE pr
            SET pr."Status" = s."Code"
            FROM "ProductionRequests" pr
            INNER JOIN "Statuses" s ON pr."StatusId" = s."Id"
        `);

        await queryRunner.query(`UPDATE "ProductionRequests" SET "Status" = 'request' WHERE "Status" IS NULL`);

        await queryRunner.query(`
            DECLARE @ConstraintName nvarchar(200)
            SELECT @ConstraintName = Name FROM sys.foreign_keys
            WHERE parent_object_id = OBJECT_ID('ProductionRequests')
            AND referenced_object_id = OBJECT_ID('Statuses')

            IF @ConstraintName IS NOT NULL
            EXEC('ALTER TABLE "ProductionRequests" DROP CONSTRAINT ' + @ConstraintName)
        `);

        await queryRunner.query(`
            DECLARE @ConstraintName nvarchar(200)
            SELECT @ConstraintName = Name FROM sys.default_constraints
            WHERE parent_object_id = OBJECT_ID('ProductionRequests')
            AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('ProductionRequests'), 'StatusId', 'ColumnId')

            IF @ConstraintName IS NOT NULL
            EXEC('ALTER TABLE "ProductionRequests" DROP CONSTRAINT ' + @ConstraintName)
        `);

        await queryRunner.query(`ALTER TABLE "ProductionRequests" DROP COLUMN "StatusId"`);

        await queryRunner.query(`DROP TABLE "Statuses"`);

        await queryRunner.query(`ALTER TABLE "ProductionRequests" ALTER COLUMN "Status" nvarchar(50) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

    }
}
