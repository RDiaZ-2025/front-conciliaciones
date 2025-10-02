import { AppDataSource } from '../config/typeorm.config';

/**
 * Migration utility functions
 */
export class MigrationUtils {
  /**
   * Run all pending migrations
   */
  static async runMigrations(): Promise<void> {
    try {
      console.log('🔄 Running pending migrations...');
      
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      const migrations = await AppDataSource.runMigrations();
      
      if (migrations.length === 0) {
        console.log('✅ No pending migrations found');
      } else {
        console.log(`✅ Successfully ran ${migrations.length} migration(s):`);
        migrations.forEach(migration => {
          console.log(`   - ${migration.name}`);
        });
      }
    } catch (error) {
      console.error('❌ Error running migrations:', error);
      throw error;
    }
  }

  /**
   * Revert the last migration
   */
  static async revertLastMigration(): Promise<void> {
    try {
      console.log('🔄 Reverting last migration...');
      
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      await AppDataSource.undoLastMigration();
      console.log('✅ Successfully reverted last migration');
    } catch (error) {
      console.error('❌ Error reverting migration:', error);
      throw error;
    }
  }

  /**
   * Show migration status
   */
  static async showMigrationStatus(): Promise<void> {
    try {
      console.log('📊 Migration Status:');
      
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      const executedMigrations = await AppDataSource.query(
        `SELECT * FROM typeorm_migrations ORDER BY timestamp DESC`
      );

      const pendingMigrations = await AppDataSource.showMigrations();

      console.log(`\n✅ Executed Migrations (${executedMigrations.length}):`);
      if (executedMigrations.length === 0) {
        console.log('   No migrations executed yet');
      } else {
        executedMigrations.forEach((migration: any) => {
          try {
            const date = new Date(Number(migration.timestamp));
            const dateStr = isNaN(date.getTime()) ? 'Invalid Date' : date.toISOString();
            console.log(`   - ${migration.name} (${dateStr})`);
          } catch (error) {
            console.log(`   - ${migration.name} (Invalid Date)`);
          }
        });
      }

      console.log(`\n⏳ Pending Migrations: ${pendingMigrations ? 'Yes' : 'No'}`);
    } catch (error) {
      console.error('❌ Error showing migration status:', error);
      throw error;
    }
  }

  /**
   * Check if database is up to date
   */
  static async isDatabaseUpToDate(): Promise<boolean> {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      const hasPendingMigrations = await AppDataSource.showMigrations();
      return !hasPendingMigrations;
    } catch (error) {
      console.error('❌ Error checking database status:', error);
      return false;
    }
  }

  /**
   * Initialize database with migrations on startup
   */
  static async initializeDatabaseWithMigrations(): Promise<void> {
    try {
      console.log('🚀 Initializing database...');
      
      // Initialize connection
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
        console.log('✅ Database connection established');
      }

      // Run migrations
      await this.runMigrations();
      
      console.log('🎉 Database initialization completed successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }
}