import { RDSClusterDetailedInfo } from '../aws/rds';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type Cluster = {
  cluster_identifier: string;
  integration: string;
  region: string;
  data: RDSClusterDetailedInfo;
};

export async function saveCluster(cluster: Cluster): Promise<number> {
  const result = await prisma.clusters.upsert({
    where: {
      integration_cluster_identifier: {
        integration: cluster.integration,
        cluster_identifier: cluster.cluster_identifier
      }
    },
    update: {
      region: cluster.region,
      data: cluster.data
    },
    create: {
      cluster_identifier: cluster.cluster_identifier,
      integration: cluster.integration,
      region: cluster.region,
      data: cluster.data
    },
    select: {
      id: true
    }
  });
  return result.id;
}

export async function associateClusterConnection(clusterId: number, connectionId: number): Promise<void> {
  await prisma.assoc_cluster_connections.create({
    data: {
      cluster_id: clusterId,
      connection_id: connectionId
    }
  });
}

export async function getClusterByConnection(connectionId: number): Promise<Cluster | null> {
  const result = await prisma.clusters.findFirst({
    where: {
      assoc_cluster_connections: {
        some: {
          connection_id: connectionId
        }
      }
    }
  });
  return result;
}

export async function getClusters(): Promise<Cluster[]> {
  const result = await prisma.clusters.findMany();
  return result;
}
