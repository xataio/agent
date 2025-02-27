import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../env/server';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20
});

export const db = drizzle(pool);
