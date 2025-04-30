'use server';

import { eq } from 'drizzle-orm';
import { CloudSQLInstanceInfo } from '../gcp/cloudsql';
import { DBAccess } from './db';
import { gcpInstanceConnections, GCPInstanceInsert, gcpInstances } from './schema';

export type GCPInstance = {
  id: string;
  projectId: string;
  instanceName: string;
  gcpProjectId: string;
  data: CloudSQLInstanceInfo;
};

export async function saveInstance(dbAccess: DBAccess, instance: GCPInstanceInsert): Promise<string> {
  return dbAccess.query(async ({ db }) => {
    const result = await db
      .insert(gcpInstances)
      .values(instance)
      .onConflictDoUpdate({
        target: [gcpInstances.projectId, gcpInstances.gcpProjectId, gcpInstances.instanceName],
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

export async function associateInstanceConnection(
  dbAccess: DBAccess,
  {
    projectId,
    instanceId,
    connectionId
  }: {
    projectId: string;
    instanceId: string;
    connectionId: string;
  }
): Promise<void> {
  return dbAccess.query(async ({ db }) => {
    await db.insert(gcpInstanceConnections).values({
      projectId,
      instanceId,
      connectionId
    });
  });
}

export async function getInstanceByConnection(dbAccess: DBAccess, connectionId: string): Promise<GCPInstance | null> {
  return dbAccess.query(async ({ db }) => {
    const result = await db
      .select()
      .from(gcpInstances)
      .innerJoin(gcpInstanceConnections, eq(gcpInstanceConnections.instanceId, gcpInstances.id))
      .where(eq(gcpInstanceConnections.connectionId, connectionId))
      .limit(1);
    return result[0]?.gcp_instances ?? null;
  });
}

export async function getInstances(dbAccess: DBAccess, projectId: string): Promise<GCPInstance[]> {
  return dbAccess.query(async ({ db }) => {
    return await db.select().from(gcpInstances).where(eq(gcpInstances.projectId, projectId));
  });
}
