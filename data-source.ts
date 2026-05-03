import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * TypeORM CLI DataSource — გამოიყენება migrations-ისთვის.
 * გამოყენება:
 *   npm run migration:run     — migrations გაშვება
 *   npm run migration:revert  — ბოლო migration-ის გაუქმება
 *   npm run migration:show    — რომელი migrations გაშვებულია
 *   npm run migration:generate -- src/migrations/MigrationName — ავტო-generate
 */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  ssl: { rejectUnauthorized: false },
  logging: ['migration'],
});
