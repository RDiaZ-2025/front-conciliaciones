# Database Migrations

This document explains how to use the TypeORM migration system in the VOC backend application.

## Overview

The migration system helps keep your database schema in sync with your code. It allows you to:
- Version control your database schema changes
- Apply changes consistently across different environments
- Rollback changes if needed
- Track what changes have been applied

## Setup

### Environment Configuration

1. Copy `.env.example` to `.env` and configure your database settings:
```bash
cp .env.example .env
```

2. Update the database configuration in `.env`:
```env
DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=your_password
DB_NAME=VOC_DB
```

## Available Commands

### TypeORM CLI Commands

```bash
# Generate a new migration based on entity changes
npm run migration:generate -- src/migrations/MigrationName

# Create an empty migration file
npm run migration:create -- src/migrations/MigrationName

# Run all pending migrations
npm run migration:run

# Revert the last migration
npm run migration:revert

# Show migration status
npm run migration:show

# Synchronize schema (development only)
npm run schema:sync

# Drop entire schema (be careful!)
npm run schema:drop
```

### Custom Migration Commands

```bash
# Initialize database with all migrations
npm run db:init

# Check migration status
npm run db:status

# Rollback last migration
npm run db:rollback

# Custom migration CLI
npm run migrate [command]
```

## Migration Files

Migration files are located in `src/migrations/` and follow the naming convention:
`{timestamp}-{DescriptiveName}.ts`

### Existing Migrations

1. `1700000001000-CreateUsersTable.ts` - Creates the USERS table
2. `1700000002000-CreatePermissionsTable.ts` - Creates the PERMISSIONS table
3. `1700000003000-CreatePermissionsByUserTable.ts` - Creates the PERMISSIONS_BY_USER table
4. `1700000004000-CreateLoadDocumentsOCbyUserTable.ts` - Creates the LoadDocumentsOCbyUser table
5. `1700000005000-CreateMenuItemsTable.ts` - Creates the MENU_ITEMS table
6. `1700000006000-CreateProductionRequestsTable.ts` - Creates the production_requests table

## Creating New Migrations

### Method 1: Generate from Entity Changes

1. Modify your entity files
2. Generate migration:
```bash
npm run migration:generate -- src/migrations/AddNewColumn
```

### Method 2: Create Empty Migration

1. Create empty migration:
```bash
npm run migration:create -- src/migrations/AddNewColumn
```

2. Edit the generated file to add your changes

### Migration Structure

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationName1234567890 implements MigrationInterface {
  name = 'MigrationName1234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Apply changes
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert changes
  }
}
```

## Best Practices

1. **Always test migrations** in development before applying to production
2. **Backup your database** before running migrations in production
3. **Never modify existing migrations** that have been applied to production
4. **Use descriptive names** for your migrations
5. **Keep migrations small** and focused on a single change
6. **Always provide a down method** to allow rollbacks

## Deployment Workflow

### Development
```bash
# Check current status
npm run db:status

# Run pending migrations
npm run db:init
```

### Production
```bash
# Always backup first!
# Check what will be applied
npm run db:status

# Apply migrations
npm run migration:run
```

## Troubleshooting

### Common Issues

1. **Connection errors**: Check your `.env` configuration
2. **Permission errors**: Ensure database user has proper permissions
3. **Migration conflicts**: Resolve by creating a new migration to fix conflicts

### Reset Database (Development Only)

```bash
# Drop all tables
npm run schema:drop

# Run all migrations from scratch
npm run db:init
```

## Integration with Application

The migration system is integrated with the application startup. The database will be automatically initialized when the application starts.

To disable automatic migrations, modify the `initializeDatabaseWithMigrations` call in your application startup code.