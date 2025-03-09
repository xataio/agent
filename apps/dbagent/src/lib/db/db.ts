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
  { admin = false, asUserId }: { admin?: boolean; asUserId?: string } = {}
): Promise<T> {
  const session = await auth();
  const userId = asUserId ?? session?.user?.id ?? '';

  // We'll use userId in raw SQL, so validate that it only contains valid UUID characters
  if (userId !== '' && userId !== 'local' && !/^[0-9a-f-]*$/i.test(userId)) {
    throw new Error('Invalid user ID format');
  }

  const client = await pool.connect();

  try {
    const db = drizzle(client);
    if (!admin) {
      if (userId === '') {
        throw new Error('Unable to query the database without a user');
      }

      await db.execute(sql.raw(`SET ROLE "user"`));
      await db.execute(sql.raw(`SET "app.current_user" = '${userId}'`));
    }

    return await callback({ db, userId });
  } finally {
    // Destroy the client to release the connection back to the pool
    client.release(true);
  }
}
