import { eq } from 'drizzle-orm';
import { db } from './db';
import { connections } from './schema';

export type DbConnection = {
  id: number;
  name: string;
  connstring: string;
  isDefault: boolean;
};

export async function listConnections(): Promise<DbConnection[]> {
  return await db.select().from(connections);
}

export async function getDefaultConnection(): Promise<DbConnection | null> {
  const result = await db.select().from(connections).where(eq(connections.isDefault, true));
  return result[0] ?? null;
}

export async function getConnection(id: number): Promise<DbConnection | null> {
  const result = await db.select().from(connections).where(eq(connections.id, id));
  return result[0] ?? null;
}

export async function makeConnectionDefault(id: number): Promise<void> {
  await db.transaction(async (trx) => {
    await trx.update(connections).set({ isDefault: false }).where(eq(connections.isDefault, true));
    await trx.update(connections).set({ isDefault: true }).where(eq(connections.id, id));
  });
}

export async function deleteConnection(id: number): Promise<void> {
  await db.transaction(async (trx) => {
    const wasDefault = await trx
      .select({ isDefault: connections.isDefault })
      .from(connections)
      .where(eq(connections.id, id));
    await trx.delete(connections).where(eq(connections.id, id));

    if (wasDefault[0]?.isDefault) {
      const nextConnection = await trx.select({ id: connections.id }).from(connections).limit(1);
      if (nextConnection[0]) {
        await trx.update(connections).set({ isDefault: true }).where(eq(connections.id, nextConnection[0].id));
      }
    }
  });
}

export async function addConnection({ name, connstring }: { name: string; connstring: string }): Promise<DbConnection> {
  const isFirst = (await db.select().from(connections)).length === 0;
  const result = await db.insert(connections).values({ name, connstring, isDefault: isFirst }).returning();

  if (!result[0]) {
    throw new Error('Error adding connection');
  }

  return result[0];
}

export async function updateConnection({
  id,
  name,
  connstring
}: {
  id: number;
  name: string;
  connstring: string;
}): Promise<DbConnection> {
  const result = await db.update(connections).set({ name, connstring }).where(eq(connections.id, id)).returning();
  if (!result[0]) {
    throw new Error('Connection not found');
  }

  return result[0];
}
