#!/usr/bin/env node

import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('⚠️ Could not load .env file from:', envPath);

  dotenv.config();
}

console.log('Environment loaded. DB_SERVER:', process.env.DB_SERVER ? 'DEFINED' : 'UNDEFINED');

import { MigrationUtils } from '../utils/migration.utils';
import { closeDatabase } from '../config/typeorm.config';

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
