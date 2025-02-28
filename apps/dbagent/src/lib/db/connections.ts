import { eq } from 'drizzle-orm';
import { db } from './db';
import { projectConnections } from './schema';

export type DbConnection = {
  id: string;
  projectId: string;
  name: string;
  isDefault: boolean;
  connectionString: string;
  info?: unknown;
};

export async function listConnections(): Promise<DbConnection[]> {
  return await db.select().from(projectConnections);
}

export async function getDefaultConnection(): Promise<DbConnection | null> {
  const result = await db.select().from(projectConnections).where(eq(projectConnections.isDefault, true));
  return result[0] ?? null;
}

export async function getConnection(id: string): Promise<DbConnection | null> {
  const result = await db.select().from(projectConnections).where(eq(projectConnections.id, id));
  return result[0] ?? null;
}

export async function makeConnectionDefault(id: string): Promise<void> {
  await db.transaction(async (trx) => {
    await trx.update(projectConnections).set({ isDefault: false }).where(eq(projectConnections.isDefault, true));
    await trx.update(projectConnections).set({ isDefault: true }).where(eq(projectConnections.id, id));
  });
}

export async function deleteConnection(id: string): Promise<void> {
  await db.transaction(async (trx) => {
    const wasDefault = await trx
      .select({ isDefault: projectConnections.isDefault })
      .from(projectConnections)
      .where(eq(projectConnections.id, id));
    await trx.delete(projectConnections).where(eq(projectConnections.id, id));

    if (wasDefault[0]?.isDefault) {
      const nextConnection = await trx.select({ id: projectConnections.id }).from(projectConnections).limit(1);
      if (nextConnection[0]) {
        await trx
          .update(projectConnections)
          .set({ isDefault: true })
          .where(eq(projectConnections.id, nextConnection[0].id));
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
  const existingConnections = await db.select().from(projectConnections);
  const result = await db
    .insert(projectConnections)
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
  const result = await db
    .update(projectConnections)
    .set({ name, connectionString })
    .where(eq(projectConnections.id, id))
    .returning();
  if (!result[0]) {
    throw new Error('Connection not found');
  }

  return result[0];
}
