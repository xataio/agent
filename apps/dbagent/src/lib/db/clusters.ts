import { eq } from 'drizzle-orm';
import { RDSClusterDetailedInfo } from '../aws/rds';
import { db } from './db';
import { awsClusters } from './schema';

export type AWSCluster = {
  id: string;
  clusterIdentifier: string;
  connectionId: string;
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

export async function getClusterByConnection(connectionId: string): Promise<AWSCluster | null> {
  const result = await db.select().from(awsClusters).where(eq(awsClusters.connectionId, connectionId)).limit(1);

  return result[0] ?? null;
}

export async function getClusters(): Promise<AWSCluster[]> {
  return await db.select().from(awsClusters);
}
