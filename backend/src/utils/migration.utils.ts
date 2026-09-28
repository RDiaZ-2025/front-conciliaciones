import { AppDataSource } from '../config/typeorm.config';

export class MigrationUtils {

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

  static async initializeDatabaseWithMigrations(): Promise<void> {
    try {

      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      await this.runMigrations();

    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }
}
