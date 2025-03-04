import { eq } from 'drizzle-orm';
import { RDSClusterDetailedInfo } from '../aws/rds';
import { db } from './db';
import { awsClusterConnections, awsClusters } from './schema';

export type AWSCluster = {
  id: string;
  clusterIdentifier: string;
  region: string;
  data: RDSClusterDetailedInfo;
};

export async function saveCluster(cluster: Omit<AWSCluster, 'id'>): Promise<string> {
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
}

export async function associateClusterConnection(clusterId: string, connectionId: string): Promise<void> {
  await db.insert(awsClusterConnections).values({ clusterId, connectionId });
}

export async function getClusterByConnection(connectionId: string): Promise<AWSCluster | null> {
  const result = await db
    .select()
    .from(awsClusters)
    .innerJoin(awsClusterConnections, eq(awsClusterConnections.clusterId, awsClusters.id))
    .where(eq(awsClusterConnections.connectionId, connectionId))
    .limit(1);

  return result[0]?.aws_clusters ?? null;
}

export async function getClusters(): Promise<AWSCluster[]> {
  return await db.select().from(awsClusters);
}
