#!/usr/bin/env node

import 'reflect-metadata';
import { MigrationUtils } from '../utils/migration.utils';
import { closeDatabase } from '../config/typeorm.config';

/**
 * Migration CLI Script
 * Usage: npm run migrate [command]
 * Commands:
 *   run     - Run all pending migrations
 *   revert  - Revert the last migration
 *   status  - Show migration status
 */

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'run':
        await MigrationUtils.runMigrations();
        break;
        
      case 'revert':
        await MigrationUtils.revertLastMigration();
        break;
        
      case 'status':
        await MigrationUtils.showMigrationStatus();
        break;
        
      default:
        /*
        console.log(`
🔧 Migration CLI Tool

Usage: npm run migrate [command]

Available commands:
  run     - Run all pending migrations
  revert  - Revert the last migration
  status  - Show migration status

Examples:
  npm run migrate run
  npm run migrate status
  npm run migrate revert
        `);
        */
        break;
    }
  } catch (error) {
    console.error('❌ Migration command failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

main();