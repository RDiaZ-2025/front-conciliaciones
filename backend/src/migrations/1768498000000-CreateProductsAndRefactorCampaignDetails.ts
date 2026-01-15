import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class CreateProductsAndRefactorCampaignDetails1768498000000 implements MigrationInterface {
    name = 'CreateProductsAndRefactorCampaignDetails1768498000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create Products table if not exists
        const productsTableExists = await queryRunner.hasTable("Products");
        if (!productsTableExists) {
            await queryRunner.query(`CREATE TABLE "Products" ("Id" int NOT NULL IDENTITY(1,1), "Name" nvarchar(255) NOT NULL, CONSTRAINT "PK_Products" PRIMARY KEY ("Id"))`);
        }
        
        // 2. Create CampaignProducts table if not exists
        const campaignProductsTableExists = await queryRunner.hasTable("CampaignProducts");
        if (!campaignProductsTableExists) {
            await queryRunner.query(`CREATE TABLE "CampaignProducts" ("Id" int NOT NULL IDENTITY(1,1), "CampaignDetailId" int NOT NULL, "ProductId" int NOT NULL, "Quantity" nvarchar(50) NOT NULL, CONSTRAINT "PK_CampaignProducts" PRIMARY KEY ("Id"))`);
            
            // 3. Add Foreign Keys
            await queryRunner.query(`ALTER TABLE "CampaignProducts" ADD CONSTRAINT "FK_CampaignProducts_CampaignDetail" FOREIGN KEY ("CampaignDetailId") REFERENCES "CampaignDetails"("Id") ON DELETE CASCADE`);
            await queryRunner.query(`ALTER TABLE "CampaignProducts" ADD CONSTRAINT "FK_CampaignProducts_Product" FOREIGN KEY ("ProductId") REFERENCES "Products"("Id")`);
        }

        // 4. Insert default products (idempotent)
        const products = ['Comercial de TV', 'Video Digital', 'Post Redes Sociales', 'Banner', 'Cuña de Radio', 'Aviso de Prensa', 'Reel', 'TikTok'];
        for (const p of products) {
            const result = await queryRunner.query(`SELECT COUNT(*) as count FROM "Products" WHERE "Name" = '${p}'`);
            // result is usually [{ count: 0 }] or similar depending on driver. 
            // In SQL Server it might be different. simpler to just try insert and catch or use IF NOT EXISTS SQL
            await queryRunner.query(`IF NOT EXISTS (SELECT * FROM "Products" WHERE "Name" = '${p}') INSERT INTO "Products" ("Name") VALUES ('${p}')`);
        }

        // 5. Drop legacy columns from CampaignDetails
        const columnsToDrop = [
            'Product1Name', 'Product1Quantity',
            'Product2Name', 'Product2Quantity',
            'Product3Name', 'Product3Quantity',
            'Product4Name', 'Product4Quantity'
        ];
        
        const table = await queryRunner.getTable("CampaignDetails");
        if (table) {
            for (const col of columnsToDrop) {
                if (table.columns.find(c => c.name === col)) {
                    await queryRunner.dropColumn("CampaignDetails", col);
                }
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 1. Drop Foreign Keys
        await queryRunner.query(`ALTER TABLE "CampaignProducts" DROP CONSTRAINT "FK_CampaignProducts_Product"`);
        await queryRunner.query(`ALTER TABLE "CampaignProducts" DROP CONSTRAINT "FK_CampaignProducts_CampaignDetail"`);

        // 2. Drop Tables
        await queryRunner.query(`DROP TABLE "CampaignProducts"`);
        await queryRunner.query(`DROP TABLE "Products"`);

        // 3. Add back legacy columns (simplified, nullable)
        const columnsToAdd = [
            'Product1Name', 'Product1Quantity',
            'Product2Name', 'Product2Quantity',
            'Product3Name', 'Product3Quantity',
            'Product4Name', 'Product4Quantity'
        ];

        for (const col of columnsToAdd) {
            await queryRunner.addColumn("CampaignDetails", new TableColumn({
                name: col,
                type: "nvarchar",
                length: "255",
                isNullable: true
            }));
        }
    }
}
