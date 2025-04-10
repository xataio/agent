'use server';

import {
  getRDSClusterInfo,
  getRDSInstanceInfo,
  initializeRDSClient,
  listRDSClusters,
  listRDSInstances,
  RDSClusterDetailedInfo,
  RDSClusterInfo
} from '~/lib/aws/rds';
import { associateClusterConnection, saveCluster } from '~/lib/db/aws-clusters';
import { getUserSessionDBAccess } from '~/lib/db/db';
import { AwsIntegration, getIntegration, saveIntegration } from '~/lib/db/integrations';
import { Connection } from '~/lib/db/schema';

export async function fetchRDSClusters(
  projectId: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string
): Promise<{ success: boolean; message: string; data: RDSClusterInfo[] }> {
  const client = initializeRDSClient({ accessKeyId, secretAccessKey, region });

  try {
    const clusters = await listRDSClusters(client);
    const instances = await listRDSInstances(client);
    // Add standalone instances as "clusters" with single instance
    const standaloneInstances = instances.filter((instance) => !instance.dbClusterIdentifier);
    const standaloneAsClusters: RDSClusterInfo[] = standaloneInstances.map((instance) => ({
      identifier: instance.identifier,
      engine: instance.engine,
      engineVersion: instance.engineVersion,
      status: instance.status,
      endpoint: instance.endpoint?.address,
      port: instance.endpoint?.port,
      multiAZ: instance.multiAZ,
      instanceCount: 1,
      allocatedStorage: instance.allocatedStorage,
      isStandaloneInstance: true
    }));
    clusters.push(...standaloneAsClusters);

    const dbAccess = await getUserSessionDBAccess();
    await saveIntegration(dbAccess, projectId, 'aws', { accessKeyId, secretAccessKey, region });
    return { success: true, message: 'RDS instances fetched successfully', data: clusters };
  } catch (error) {
    console.error('Error fetching RDS instances:', error);
    return { success: false, message: 'Error fetching RDS instances', data: [] };
  }
}

export async function fetchRDSClusterDetails(
  projectId: string,
  clusterInfo: RDSClusterInfo
): Promise<{ success: boolean; message: string; data: RDSClusterDetailedInfo | null }> {
  const dbAccess = await getUserSessionDBAccess();
  const aws = await getIntegration(dbAccess, projectId, 'aws');
  if (!aws) {
    return { success: false, message: 'AWS integration not found', data: null };
  }
  const client = initializeRDSClient({
    accessKeyId: aws.accessKeyId,
    secretAccessKey: aws.secretAccessKey,
    region: aws.region
  });

  if (clusterInfo.isStandaloneInstance) {
    const instance = await getRDSInstanceInfo(clusterInfo.identifier, client);
    if (!instance) {
      return { success: false, message: 'RDS instance not found', data: null };
    }
    const cluster = {
      ...clusterInfo,
      instances: [instance]
    };
    return { success: true, message: 'RDS instance details fetched successfully', data: cluster };
  } else {
    const cluster = await getRDSClusterInfo(clusterInfo.identifier, client);
    if (!cluster) {
      return { success: false, message: 'RDS cluster not found', data: null };
    }
    return { success: true, message: 'RDS cluster details fetched successfully', data: cluster };
  }
}

export async function getAWSIntegration(
  projectId: string
): Promise<{ success: boolean; message: string; data: AwsIntegration | null }> {
  const dbAccess = await getUserSessionDBAccess();
  try {
    const aws = await getIntegration(dbAccess, projectId, 'aws');
    if (!aws) {
      return { success: false, message: 'AWS integration not found', data: null };
    }
    return { success: true, message: 'AWS integration found', data: aws };
  } catch (error) {
    console.error('Error fetching AWS integration:', error);
    return { success: false, message: 'Error fetching AWS integration', data: null };
  }
}

export async function saveClusterDetails(
  clusterIdentifier: string,
  region: string,
  connection: Connection
): Promise<{ success: boolean; message: string }> {
  const dbAccess = await getUserSessionDBAccess();
  const aws = await getIntegration(dbAccess, connection.projectId, 'aws');
  if (!aws) {
    return { success: false, message: 'AWS integration not found' };
  }
  const client = initializeRDSClient({
    accessKeyId: aws.accessKeyId,
    secretAccessKey: aws.secretAccessKey,
    region: region
  });
  const cluster = await getRDSClusterInfo(clusterIdentifier, client);
  if (cluster) {
    const instanceId = await saveCluster(dbAccess, {
      projectId: connection.projectId,
      clusterIdentifier,
      region,
      data: cluster
    });
    await associateClusterConnection(dbAccess, {
      projectId: connection.projectId,
      clusterId: instanceId,
      connectionId: connection.id
    });
    return { success: true, message: 'Cluster details saved successfully' };
  } else {
    const instance = await getRDSInstanceInfo(clusterIdentifier, client);
    if (!instance) {
      return { success: false, message: 'RDS instance not found' };
    }
    const instanceId = await saveCluster(dbAccess, {
      projectId: connection.projectId,
      clusterIdentifier,
      region,
      data: {
        instances: [instance],
        identifier: instance.identifier,
        engine: instance.engine,
        engineVersion: instance.engineVersion,
        status: instance.status,
        endpoint: instance.endpoint?.address,
        port: instance.endpoint?.port,
        multiAZ: instance.multiAZ,
        instanceCount: 1,
        allocatedStorage: instance.allocatedStorage,
        isStandaloneInstance: true
      }
    });
    await associateClusterConnection(dbAccess, {
      projectId: connection.projectId,
      clusterId: instanceId,
      connectionId: connection.id
    });
    return { success: true, message: 'Instance details saved successfully' };
  }
}
