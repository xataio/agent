import { eq } from 'drizzle-orm';
import { db } from './db';
import { connections } from './schema';

export type DbConnection = {
  id: string;
  projectId: string;
  name: string;
  isDefault: boolean;
  connectionString: string;
  info?: unknown;
};

export async function listConnections(): Promise<DbConnection[]> {
  return await db.select().from(connections);
}

export async function getDefaultConnection(): Promise<DbConnection | null> {
  const result = await db.select().from(connections).where(eq(connections.isDefault, true));
  return result[0] ?? null;
}

export async function getConnection(id: string): Promise<DbConnection | null> {
  const result = await db.select().from(connections).where(eq(connections.id, id));
  return result[0] ?? null;
}

export async function makeConnectionDefault(id: string): Promise<void> {
  await db.transaction(async (trx) => {
    await trx.update(connections).set({ isDefault: false }).where(eq(connections.isDefault, true));
    await trx.update(connections).set({ isDefault: true }).where(eq(connections.id, id));
  });
}

export async function deleteConnection(id: string): Promise<void> {
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

export async function addConnection({
  projectId,
  name,
  connectionString
}: {
  projectId: string;
  name: string;
  connectionString: string;
}): Promise<DbConnection> {
  const existingConnections = await db.select().from(connections);
  const result = await db
    .insert(connections)
    .values({
      projectId,
      name,
      connectionString,
      isDefault: existingConnections.length === 0
    })
    .returning();

  if (!result[0]) {
    throw new Error('Error adding connection');
  }

  return result[0];
}

export async function updateConnection({
  id,
  name,
  connectionString
}: {
  id: string;
  name: string;
  connectionString: string;
}): Promise<DbConnection> {
  const result = await db.update(connections).set({ name, connectionString }).where(eq(connections.id, id)).returning();
  if (!result[0]) {
    throw new Error('Connection not found');
  }

  return result[0];
}
