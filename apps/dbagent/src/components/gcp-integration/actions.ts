'use server';

import { GcpIntegration, getIntegration, saveIntegration } from '~/lib/db/integrations';
import { CloudSQLInstanceInfo, initializeCloudSQLClient, listCloudSQLInstances } from '~/lib/gcp/cloudsql';

export interface CloudSQLInstancesResponse {
  success: boolean;
  data: CloudSQLInstanceInfo[];
  message?: string;
}

export async function fetchCloudSQLInstances(
  projectId: string,
  gcpProjectId: string,
  clientEmail: string,
  privateKey: string
): Promise<CloudSQLInstancesResponse> {
  const client = initializeCloudSQLClient({ clientEmail, privateKey });

  try {
    const instances = await listCloudSQLInstances(client, gcpProjectId);
    await saveIntegration(projectId, 'gcp', { clientEmail, privateKey, gcpProjectId });
    return {
      success: true,
      data: instances,
      message: 'Cloud SQL instances fetched successfully'
    };
  } catch (error) {
    console.error('Error fetching Cloud SQL instances:', error);
    return { success: false, data: [], message: 'Error fetching Cloud SQL instances' };
  }
}

export interface CloudSQLInstanceDetailedInfo extends CloudSQLInstanceInfo {
  connectionName: string;
  ipAddresses: { type: string; ipAddress: string }[];
  settings: {
    tier: string;
    availabilityType: string;
    dataDiskSizeGb: string;
  };
}

// Define the response type for getGCPIntegration
export interface GCPIntegrationResponse {
  success: boolean;
  data: {
    clientEmail: string;
    privateKey: string;
    region?: string;
  } | null;
}

export async function getGCPIntegration(
  projectId: string
): Promise<{ success: boolean; message: string; data: GcpIntegration | null }> {
  try {
    const gcp = await getIntegration(projectId, 'gcp');
    if (!gcp) {
      return { success: false, message: 'GCP integration not found', data: null };
    }
    return { success: true, message: 'GCP integration found', data: gcp };
  } catch (error) {
    console.error('Error fetching GCP integration:', error);
    return { success: false, message: 'Error fetching GCP integration', data: null };
  }
}
