'use server';

import { eq } from 'drizzle-orm';
import { RDSClusterDetailedInfo } from '../aws/rds';
import { queryDb } from './db';
import { awsClusterConnections, awsClusters } from './schema';

export type AWSCluster = {
  id: string;
  projectId: string;
  clusterIdentifier: string;
  region: string;
  data: RDSClusterDetailedInfo;
};

export async function saveCluster(cluster: Omit<AWSCluster, 'id'>): Promise<string> {
  return queryDb(async ({ db }) => {
    const result = await db
      .insert(awsClusters)
      .values(cluster)
      .onConflictDoUpdate({
        target: [awsClusters.clusterIdentifier],
        set: {
          region: cluster.region,
          data: cluster.data
        }
      })
      .returning({ id: awsClusters.id });
    if (!result[0]) {
      throw new Error('Failed to save cluster');
    }
    return result[0].id;
  });
}

export async function associateClusterConnection({
  projectId,
  clusterId,
  connectionId
}: {
  projectId: string;
  clusterId: string;
  connectionId: string;
}): Promise<void> {
  return queryDb(async ({ db }) => {
    await db.insert(awsClusterConnections).values({
      projectId,
      clusterId,
      connectionId
    });
  });
}

export async function getClusterByConnection(connectionId: string, asUserId?: string): Promise<AWSCluster | null> {
  return queryDb(
    async ({ db }) => {
      const result = await db
        .select()
        .from(awsClusters)
        .innerJoin(awsClusterConnections, eq(awsClusterConnections.clusterId, awsClusters.id))
        .where(eq(awsClusterConnections.connectionId, connectionId))
        .limit(1);
      return result[0]?.aws_clusters ?? null;
    },
    {
      asUserId: asUserId
    }
  );
}

export async function getClusters(projectId: string): Promise<AWSCluster[]> {
  return queryDb(async ({ db }) => {
    return await db.select().from(awsClusters).where(eq(awsClusters.projectId, projectId));
  });
}
