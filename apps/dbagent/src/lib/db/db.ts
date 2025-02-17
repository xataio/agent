import { Pool } from 'pg';
import { env } from '../env/db';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20
});
