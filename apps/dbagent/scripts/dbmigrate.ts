/* eslint-disable no-process-env */
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function runMigrations() {
  try {
    console.log('Running Prisma migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('Prisma migrations completed successfully');
  } catch (error) {
    console.error('Failed to run Prisma migrations');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runMigrations();
