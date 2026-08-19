import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCustomersTable1788000000000 implements MigrationInterface {
    name = 'CreateCustomersTable1788000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "Customers" (
                "Id" int IDENTITY(1,1) NOT NULL,
                "DocumentType" nvarchar(50) NOT NULL,
                "DocumentNumber" nvarchar(50) NOT NULL,
                "BusinessName" nvarchar(255) NULL,
                "Email" nvarchar(255) NOT NULL,
                "PhoneNumber" nvarchar(50) NULL,
                "IsActive" bit NOT NULL DEFAULT 1,
                "CreatedAt" datetime NOT NULL DEFAULT getdate(),
                "UpdatedAt" datetime NOT NULL DEFAULT getdate(),
                CONSTRAINT "PK_Customers" PRIMARY KEY ("Id"),
                CONSTRAINT "UQ_Customers_Doc" UNIQUE ("DocumentType", "DocumentNumber")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "Customers"`);
    }
}
