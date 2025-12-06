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
      
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      const migrations = await AppDataSource.runMigrations();
      
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
      
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      await AppDataSource.undoLastMigration();
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
      
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      const executedMigrations = await AppDataSource.query(
        `SELECT * FROM typeorm_migrations ORDER BY timestamp DESC`
      );

      const pendingMigrations = await AppDataSource.showMigrations();

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
      
      // Initialize connection
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      // Run migrations
      await this.runMigrations();
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }
}