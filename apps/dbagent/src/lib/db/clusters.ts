import { eq } from 'drizzle-orm';
import { RDSClusterDetailedInfo } from '../aws/rds';
import { db } from './db';
import { awsClusterConnections, awsClusters } from './schema';

export type Cluster = {
  clusterIdentifier: string;
  region: string;
  data: RDSClusterDetailedInfo;
};

export async function saveCluster(cluster: Cluster): Promise<string> {
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

export async function getClusterByConnection(connectionId: string): Promise<Cluster | null> {
  const result = await db
    .select()
    .from(awsClusters)
    .innerJoin(awsClusterConnections, eq(awsClusterConnections.clusterId, awsClusters.id))
    .where(eq(awsClusterConnections.connectionId, connectionId))
    .limit(1);

  return result[0]?.aws_clusters ?? null;
}

export async function getClusters(): Promise<Cluster[]> {
  return await db.select().from(awsClusters);
}
