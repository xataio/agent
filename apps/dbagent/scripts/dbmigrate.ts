/* eslint-disable no-process-env */
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local file
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

function executeMigration(filePath: string) {
  console.log(`\nExecuting migration: ${path.basename(filePath)}`);
  try {
    execSync(`psql "${process.env.DATABASE_URL}" < "${filePath}"`, {
      stdio: 'inherit'
    });
  } catch (error) {
    console.error(`Failed to execute migration ${filePath}`);
    throw error;
  }
}

function runMigrations() {
  // Get all .sql files and sort them alphabetically
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file: string) => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    executeMigration(path.join(MIGRATIONS_DIR, file));
  }

  console.log('All migrations completed successfully');
}

runMigrations();
