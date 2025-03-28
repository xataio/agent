'use server';

import { and, eq } from 'drizzle-orm';
import { queryDb } from './db';
import { Schedule } from './schedules';
import { connections } from './schema';

export type Connection = {
  id: string;
  projectId: string;
  name: string;
  isDefault: boolean;
  connectionString: string;
};

export async function listConnections(projectId: string): Promise<Connection[]> {
  return queryDb(async ({ db }) => {
    return await db.select().from(connections).where(eq(connections.projectId, projectId));
  });
}

export async function getDefaultConnection(projectId: string): Promise<Connection | null> {
  return queryDb(async ({ db }) => {
    const result = await db
      .select()
      .from(connections)
      .where(and(eq(connections.projectId, projectId), eq(connections.isDefault, true)));
    return result[0] ?? null;
  });
}

export async function getConnection(id: string): Promise<Connection | null> {
  return queryDb(async ({ db }) => {
    const result = await db.select().from(connections).where(eq(connections.id, id));
    return result[0] ?? null;
  });
}

export async function getConnectionByName(projectId: string, name: string): Promise<Connection | null> {
  return queryDb(async ({ db }) => {
    const result = await db
      .select()
      .from(connections)
      .where(and(eq(connections.projectId, projectId), eq(connections.name, name)));
    return result[0] ?? null;
  });
}

export async function getConnectionFromSchedule(schedule: Schedule): Promise<Connection | null> {
  return queryDb(
    async ({ db }) => {
      const result = await db.select().from(connections).where(eq(connections.id, schedule.connectionId));
      return result[0] ?? null;
    },
    {
      asUserId: schedule.userId
    }
  );
}

export async function makeConnectionDefault(id: string): Promise<void> {
  return queryDb(async ({ db }) => {
    await db.transaction(async (trx) => {
      await trx.update(connections).set({ isDefault: false }).where(eq(connections.isDefault, true));
      await trx.update(connections).set({ isDefault: true }).where(eq(connections.id, id));
    });
  });
}

export async function deleteConnection(id: string): Promise<void> {
  return queryDb(async ({ db }) => {
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
}): Promise<Connection> {
  return queryDb(async ({ db }) => {
    const existingConnections = await db.select().from(connections).where(eq(connections.projectId, projectId));
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
  });
}

export async function updateConnection({
  id,
  name,
  connectionString
}: {
  id: string;
  name: string;
  connectionString: string;
}): Promise<Connection> {
  return queryDb(async ({ db }) => {
    const result = await db
      .update(connections)
      .set({ name, connectionString })
      .where(eq(connections.id, id))
      .returning();
    if (!result[0]) {
      throw new Error('Connection not found');
    }
    return result[0];
  });
}
