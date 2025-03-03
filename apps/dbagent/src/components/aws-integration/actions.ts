'use server';

import {
  getRDSClusterInfo,
  initializeRDSClient,
  listRDSClusters,
  RDSClusterDetailedInfo,
  RDSClusterInfo
} from '~/lib/aws/rds';
import { AwsIntegration, getIntegration, saveIntegration } from '~/lib/db/integrations';
import { saveProject } from '~/lib/db/projects';

export async function fetchRDSClusters(
  projectId: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string
): Promise<{ success: boolean; message: string; data: RDSClusterInfo[] }> {
  const client = initializeRDSClient({ accessKeyId, secretAccessKey, region });

  try {
    const clusters = await listRDSClusters(client);
    await saveIntegration(projectId, 'aws', { accessKeyId, secretAccessKey, region });
    return { success: true, message: 'RDS instances fetched successfully', data: clusters };
  } catch (error) {
    console.error('Error fetching RDS instances:', error);
    return { success: false, message: 'Error fetching RDS instances', data: [] };
  }
}

export async function fetchRDSClusterDetails(
  clusterIdentifier: string
): Promise<{ success: boolean; message: string; data: RDSClusterDetailedInfo | null }> {
  const aws = await getIntegration('aws');
  if (!aws) {
    return { success: false, message: 'AWS integration not found', data: null };
  }
  const client = initializeRDSClient({
    accessKeyId: aws.accessKeyId,
    secretAccessKey: aws.secretAccessKey,
    region: aws.region
  });
  const cluster = await getRDSClusterInfo(clusterIdentifier, client);
  if (!cluster) {
    return { success: false, message: 'RDS cluster not found', data: null };
  }
  return { success: true, message: 'RDS cluster details fetched successfully', data: cluster };
}

export async function getAWSIntegration(): Promise<{ success: boolean; message: string; data: AwsIntegration | null }> {
  try {
    const aws = await getIntegration('aws');
    if (!aws) {
      return { success: false, message: 'AWS integration not found', data: null };
    }
    return { success: true, message: 'AWS integration found', data: aws };
  } catch (error) {
    console.error('Error fetching AWS integration:', error);
    return { success: false, message: 'Error fetching AWS integration', data: null };
  }
}

export async function saveProjectDetails({
  name,
  ownerId,
  clusterIdentifier,
  region
}: {
  name: string;
  ownerId: string;
  clusterIdentifier: string;
  region: string;
}): Promise<{ success: boolean; message: string }> {
  const aws = await getIntegration('aws');
  if (!aws) {
    return { success: false, message: 'AWS integration not found' };
  }

  const client = initializeRDSClient({
    accessKeyId: aws.accessKeyId,
    secretAccessKey: aws.secretAccessKey,
    region: region
  });

  const instance = await getRDSClusterInfo(clusterIdentifier, client);
  if (!instance) {
    return { success: false, message: 'RDS instance not found' };
  }

  await saveProject({
    name,
    ownerId,
    type: 'rds',
    info: {
      clusterIdentifier,
      region,
      details: instance
    }
  });

  return { success: true, message: 'Instance details saved successfully' };
}
