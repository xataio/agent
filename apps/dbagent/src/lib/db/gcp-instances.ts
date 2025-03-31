'use server';

import { eq } from 'drizzle-orm';
import { CloudSQLInstanceInfo } from '../gcp/cloudsql';
import { queryDb } from './db';
import { gcpInstanceConnections, gcpInstances } from './schema';

export type GCPInstance = {
  id: string;
  projectId: string;
  instanceName: string;
  gcpProjectId: string;
  data: CloudSQLInstanceInfo;
};

export async function saveInstance(instance: Omit<GCPInstance, 'id'>): Promise<string> {
  return queryDb(async ({ db }) => {
    const result = await db
      .insert(gcpInstances)
      .values(instance)
      .onConflictDoUpdate({
        target: [gcpInstances.gcpProjectId, gcpInstances.instanceName],
        set: {
          data: instance.data
        }
      })
      .returning({ id: gcpInstances.id });
    if (!result[0]) {
      throw new Error('Failed to save instance');
    }
    return result[0].id;
  });
}

export async function associateInstanceConnection({
  projectId,
  instanceId,
  connectionId
}: {
  projectId: string;
  instanceId: string;
  connectionId: string;
}): Promise<void> {
  return queryDb(async ({ db }) => {
    await db.insert(gcpInstanceConnections).values({
      projectId,
      instanceId,
      connectionId
    });
  });
}

export async function getInstanceByConnection(connectionId: string, asUserId?: string): Promise<GCPInstance | null> {
  return queryDb(
    async ({ db }) => {
      const result = await db
        .select()
        .from(gcpInstances)
        .innerJoin(gcpInstanceConnections, eq(gcpInstanceConnections.instanceId, gcpInstances.id))
        .where(eq(gcpInstanceConnections.connectionId, connectionId))
        .limit(1);
      return result[0]?.gcp_instances ?? null;
    },
    {
      asUserId: asUserId
    }
  );
}

export async function getInstances(projectId: string): Promise<GCPInstance[]> {
  return queryDb(async ({ db }) => {
    return await db.select().from(gcpInstances).where(eq(gcpInstances.projectId, projectId));
  });
}
