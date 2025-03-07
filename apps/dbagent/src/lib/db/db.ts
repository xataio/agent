import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { auth } from '~/auth';
import { env } from '../env/server';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20
});

export async function queryDb<T>(
  callback: (params: { db: ReturnType<typeof drizzle>; userId: string }) => Promise<T>,
  { admin = false }: { admin?: boolean } = {}
): Promise<T> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error('Not authenticated');
  }

  const client = await pool.connect();

  try {
    const db = drizzle(client);
    if (!admin) {
      await db.execute(sql.raw(`SET ROLE "user"`));
      await db.execute(sql.raw(`SET "app.current_user" = '${userId}'`));
    }

    return await callback({ db, userId });
  } finally {
    // Destroy the client to release the connection back to the pool
    client.release(true);
  }
}
