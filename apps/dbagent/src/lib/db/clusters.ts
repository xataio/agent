import { eq } from 'drizzle-orm';
import { RDSClusterDetailedInfo } from '../aws/rds';
import { db } from './db';
import { assoc_cluster_connections, clusters } from './schema';

export type Cluster = {
  clusterIdentifier: string;
  integration: string;
  region: string;
  data: RDSClusterDetailedInfo;
};

export async function saveCluster(cluster: Cluster): Promise<string> {
  const result = await db
    .insert(clusters)
    .values(cluster)
    .onConflictDoUpdate({
      target: [clusters.integration, clusters.clusterIdentifier],
      set: {
        region: cluster.region,
        data: cluster.data
      }
    })
    .returning({ id: clusters.id });

  if (!result[0]) {
    throw new Error('Failed to save cluster');
  }

  return result[0].id;
}

export async function associateClusterConnection(clusterId: string, connectionId: string): Promise<void> {
  await db.insert(assoc_cluster_connections).values({ clusterId, connectionId });
}

export async function getClusterByConnection(connectionId: string): Promise<Cluster | null> {
  const result = await db
    .select()
    .from(clusters)
    .innerJoin(assoc_cluster_connections, eq(assoc_cluster_connections.clusterId, clusters.id))
    .where(eq(assoc_cluster_connections.connectionId, connectionId))
    .limit(1);

  return result[0]?.clusters ?? null;
}

export async function getClusters(): Promise<Cluster[]> {
  return await db.select().from(clusters);
}
