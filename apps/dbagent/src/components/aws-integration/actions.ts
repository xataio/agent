'use server';

import {
  getRDSClusterInfo,
  getRDSInstanceInfo,
  initializeRDSClient,
  isEc2InstanceWithRole, // Added import
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
  integration: AwsIntegration
): Promise<{ success: boolean; message: string; data: RDSClusterInfo[] }> {
  try {
    const client = await initializeRDSClient(integration);
    const clusters = await listRDSClusters(client);
    const instances = await listRDSInstances(client);

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
  integration: AwsIntegration
): Promise<{ success: boolean; message: string; data: RDSClusterDetailedInfo | null }> {
  try {
    const client = await initializeRDSClient(integration);

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
    // For example, if 'authMethod' was missing in older records, default it to 'credentials'
    const validatedAws: AwsIntegration = {
      authMethod: aws.authMethod || 'credentials',
      region: aws.region,
      ...(aws.authMethod === 'credentials' && {
        accessKeyId: aws.accessKeyId,
        secretAccessKey: aws.secretAccessKey
      }),
      ...(aws.authMethod === 'cloudformation' && {
        cloudformationStackArn: aws.cloudformationStackArn
      })
    } as AwsIntegration;

    return { success: true, message: 'AWS integration found', data: validatedAws };
  } catch (error) {
    console.error('Error fetching AWS integration:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, message: `Error fetching AWS integration: ${errorMessage}`, data: null };
  }
}

export async function checkEc2InstanceRoleStatus(): Promise<{
  success: boolean;
  message: string;
  data: { hasIAMRole: boolean } | null;
}> {
  try {
    const hasIAMRole = await isEc2InstanceWithRole();
    return {
      success: true,
      message: 'Successfully checked EC2 instance IAM role status.',
      data: { hasIAMRole }
    };
  } catch (error) {
    console.error('Error checking EC2 instance IAM role status:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, message: `Error checking EC2 status: ${errorMessage}`, data: null };
  }
}

export async function saveClusterDetails(
  clusterIdentifier: string,
  connection: Connection
): Promise<{ success: boolean; message: string }> {
  const dbAccess = await getUserSessionDBAccess();
  try {
    const integration = await getAWSIntegration(connection.projectId);
    if (!integration.success || !integration.data) {
      return { success: false, message: 'AWS integration not found' };
    }

    const client = await initializeRDSClient(integration.data);

    const cluster = await getRDSClusterInfo(clusterIdentifier, client);
    if (cluster) {
      const clusterId = await saveCluster(dbAccess, {
        projectId: connection.projectId,
        clusterIdentifier,
        region: integration.data.region,
        data: cluster
      });
      await associateClusterConnection(dbAccess, {
        projectId: connection.projectId,
        clusterId,
        connectionId: connection.id
      });
      return { success: true, message: 'Cluster details saved successfully' };
    } else {
      const instanceInfo = await getRDSInstanceInfo(clusterIdentifier, client);
      if (instanceInfo) {
        const standaloneAsClusterData: RDSClusterDetailedInfo = {
          identifier: instanceInfo.identifier,
          engine: instanceInfo.engine,
          engineVersion: instanceInfo.engineVersion,
          status: instanceInfo.status,
          endpoint: instanceInfo.endpoint?.address,
          port: instanceInfo.endpoint?.port,
          multiAZ: instanceInfo.multiAZ,
          instanceCount: 1,
          allocatedStorage: instanceInfo.allocatedStorage,
          isStandaloneInstance: true,
          instances: [instanceInfo]
        };
        const instanceDbId = await saveCluster(dbAccess, {
          projectId: connection.projectId,
          clusterIdentifier,
          region: integration.data.region,
          data: standaloneAsClusterData
        });
        await associateClusterConnection(dbAccess, {
          projectId: connection.projectId,
          clusterId: instanceDbId,
          connectionId: connection.id
        });
        return { success: true, message: 'Instance details saved successfully' };
      } else {
        return { success: false, message: 'RDS cluster or instance not found' };
      }
    }
  } catch (error) {
    console.error('Error saving cluster/instance details:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, message: `Error saving details: ${errorMessage}` };
  }
}
