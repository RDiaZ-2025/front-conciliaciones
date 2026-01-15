import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorUserTeamRelationship1768519477572 implements MigrationInterface {
    name = 'RefactorUserTeamRelationship1768519477572'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Add TeamId column to Users
        await queryRunner.query(`ALTER TABLE "Users" ADD "TeamId" int`);

        // 2. Migrate existing data from UserByTeam to Users table
        // We pick one team per user (arbitrary if multiple, but logic implies one-to-many now)
        // MSSQL syntax for update with join
        await queryRunner.query(`
            UPDATE U
            SET U."TeamId" = UBT."TeamId"
            FROM "Users" U
            INNER JOIN "UserByTeam" UBT ON U."Id" = UBT."UserId"
        `);

        // 3. Add Foreign Key constraint
        await queryRunner.query(`ALTER TABLE "Users" ADD CONSTRAINT "FK_Users_Team" FOREIGN KEY ("TeamId") REFERENCES "Teams"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        // 4. Drop the legacy UserByTeam table
        await queryRunner.query(`DROP TABLE "UserByTeam"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 1. Recreate UserByTeam table
        await queryRunner.query(`CREATE TABLE "UserByTeam" ("Id" int IDENTITY(1,1) NOT NULL, "UserId" int NOT NULL, "TeamId" int NOT NULL, CONSTRAINT "PK_UserByTeam" PRIMARY KEY ("Id"))`);
        
        // 2. Restore data (migrate back from Users.TeamId)
        await queryRunner.query(`
            INSERT INTO "UserByTeam" ("UserId", "TeamId")
            SELECT "Id", "TeamId" FROM "Users" WHERE "TeamId" IS NOT NULL
        `);

        // 3. Add FKs back to UserByTeam (Best effort)
        await queryRunner.query(`ALTER TABLE "UserByTeam" ADD CONSTRAINT "FK_UserByTeam_User" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "UserByTeam" ADD CONSTRAINT "FK_UserByTeam_Team" FOREIGN KEY ("TeamId") REFERENCES "Teams"("Id") ON DELETE CASCADE`);

        // 4. Drop Foreign Key from Users
        await queryRunner.query(`ALTER TABLE "Users" DROP CONSTRAINT "FK_Users_Team"`);

        // 5. Drop TeamId column from Users
        await queryRunner.query(`ALTER TABLE "Users" DROP COLUMN "TeamId"`);
    }
}
