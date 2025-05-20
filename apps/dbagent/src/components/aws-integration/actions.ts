'use server';

import {
  getRDSClusterInfo,
  getRDSInstanceInfo,
  initializeRDSClient,
  getRDSClusterInfo,
  getRDSInstanceInfo,
  initializeRDSClient,
  isEc2InstanceWithRole, // Import the new function
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
  integration: AwsIntegration // Updated signature
): Promise<{ success: boolean; message: string; data: RDSClusterInfo[] }> {
  try {
    const client = await initializeRDSClient(integration); // Updated client initialization
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
    // Save the integration details (this will update if it already exists)
    await saveIntegration(dbAccess, projectId, 'aws', integration);
    return { success: true, message: 'RDS clusters/instances fetched successfully', data: clusters };
  } catch (error) {
    console.error('Error fetching RDS clusters/instances:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, message: `Error fetching RDS clusters/instances: ${errorMessage}`, data: [] };
  }
}

export async function fetchRDSClusterDetails(
  projectId: string,
  clusterInfo: RDSClusterInfo,
  integration: AwsIntegration // Updated signature
): Promise<{ success: boolean; message: string; data: RDSClusterDetailedInfo | null }> {
  try {
    const client = await initializeRDSClient(integration); // Updated client initialization

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
  } catch (error) {
    console.error('Error fetching RDS cluster/instance details:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, message: `Error fetching details: ${errorMessage}`, data: null };
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
    // Ensure the returned data conforms to AwsIntegration, especially if old data might exist
    // For example, if 'authMethod' was missing in older records, default it.
    const validatedAws: AwsIntegration = {
      authMethod: aws.authMethod || 'credentials', // Default to credentials if not present
      region: aws.region,
      ...(aws.authMethod === 'credentials' && {
        accessKeyId: aws.accessKeyId,
        secretAccessKey: aws.secretAccessKey
      }),
      ...(aws.authMethod === 'cloudformation' && {
        cloudformationStackArn: aws.cloudformationStackArn
      })
      // EC2 instance has no specific extra fields other than region
    } as AwsIntegration; // Type assertion might be needed if structure varies wildly

    return { success: true, message: 'AWS integration found', data: validatedAws };
  } catch (error) {
    console.error('Error fetching AWS integration:', error);
    return { success: false, message: 'Error fetching AWS integration', data: null };
  }
}

export async function saveClusterDetails(
  clusterIdentifier: string,
  region: string, // Region is still passed, but integration object is primary
  connection: Connection,
  integration: AwsIntegration // Pass the full integration object
): Promise<{ success: boolean; message: string }> {
  const dbAccess = await getUserSessionDBAccess();
  // No need to getIntegration again if we pass it directly
  // const aws = await getIntegration(dbAccess, connection.projectId, 'aws');
  // if (!aws) {
  //   return { success: false, message: 'AWS integration not found' };
  // }

  try {
    const client = await initializeRDSClient(integration); // Use the passed integration

    const cluster = await getRDSClusterInfo(clusterIdentifier, client);
    if (cluster) {
      const instanceId = await saveCluster(dbAccess, {
        projectId: connection.projectId,
        clusterIdentifier,
        region: integration.region, // Use region from integration object
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
