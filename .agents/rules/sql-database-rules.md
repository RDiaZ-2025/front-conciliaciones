# SQL Database Rules and Standards

This document establishes the guidelines, workflows, and rules for modifying the SQL Server database schema, generating Entity Framework Core migrations, and keeping visual models and documentation in sync.

---

## 1. Documentation & Diagram Synchronization

> [!IMPORTANT]
> The DBML database schema document [database.dbml](./database.dbml) acts as the single source of truth for visual diagramming on [dbdiagram.io](https://dbdiagram.io).

- **Mandatory Updates**: Any database schema modification (adding/deleting/modifying columns, keys, indexes, or relationships) **must** be documented in [database.dbml](./database.dbml) as part of the same pull request or commit.
- **DBML Schema Format**: Keep types generic and ensure references (`Ref:`) match actual Entity Framework relationships exactly.

---

## 2. Entity Framework Core Migrations

We use **EF Core Migrations** to manage database schema updates. Direct changes to local or remote database instances are strictly prohibited.

### 2.1 Generating Migrations
Always generate migrations from the root folder containing the EF Core startup and target projects.
Use the following command structure to create a migration:

```bash
dotnet ef migrations add <MigrationName> --project <PathToDataProject> --startup-project <PathToStartupApiProject>
```

- **Naming Convention**: Use descriptive CamelCase names describing the schema changes (e.g., `AddNewFieldToTable`, `CreateNewEntityTable`).
- **Review Migrations**: Inspect both the generated `<MigrationName>.cs` and `<MigrationName>.Designer.cs` files to verify that EF Core has mapped properties, relationships, and constraints correctly.

### 2.2 Applying Migrations
Apply migrations programmatically on application startup, or run the following command to update a local database:

```bash
dotnet ef database update --project <PathToDataProject> --startup-project <PathToStartupApiProject>
```

---

## 3. Database Object Creation & Design Guidelines

To keep the codebase high-performing, maintainable, and aligned with standard relational design:

- **Entity Identifiers (PK)**: Every table must have a primary key, typically named `Id` (integer with Identity increment) or a unique GUID.
- **Auditing Fields**: Every core transaction table should implement standard auditing properties:
  - `CreatedAt` (DateTime2, not null)
  - `UpdatedAt` (DateTime2, nullable)
  - `IsActive` (Boolean, not null, default: true)
- **Relationships and Constraints**:
  - Always declare foreign keys explicitly on the EF DbContext configuration (`OnModelCreating`).
  - Use `DeleteBehavior.Restrict` instead of cascading deletes for top-level parent entities to prevent accidental data loss.
- **Indexes**:
  - Automatically index columns that are frequently used in query filters (`Where` clauses) or foreign keys.
  - Define composite unique indexes (e.g., `Table.Key` + `Table.TypeCode`) to enforce business rules at the database engine level.
- **Naming Conventions**:
  - Entity classes must be singular (e.g., `Product`).
  - Database tables must be pluralized (e.g., `Products`).
  - Columns should use PascalCase matching the entity's property names.

---

## 4. Code & Database Sync Verification

Before committing database modifications, complete the following verification checklist:

1. [ ] **Build Check**: Build the solution to verify that DBContext compiles correctly.
2. [ ] **Migration Check**: Generate the migration files and inspect the code diff.
3. [ ] **DBML Sync**: Update [database.dbml](./database.dbml) with the new columns/tables.
4. [ ] **Seed Updates**: If necessary, update SQL seed scripts under the SQL seed directory (e.g., `populate_tables.sql`) to match new schema properties.
5. [ ] **Dry Run**: Run the migration update on a local development instance before deploying.
