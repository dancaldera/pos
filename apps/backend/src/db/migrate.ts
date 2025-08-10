import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './index.js';
import { logger } from '../utils/logger.js';

// This script will migrate the database to the latest schema
async function runMigration() {
  logger.info('Running migrations...');
  
  try {
    await migrate(db, { migrationsFolder: 'drizzle' });
    logger.info('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', error);
    process.exit(1);
  }
}

runMigration();
