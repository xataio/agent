import { auth, sqladmin_v1beta4 } from '@googleapis/sqladmin';

export interface CloudSQLInstanceInfo {
  name: string;
  id: string;
  engine: string;
  engineVersion: string;
  tier: string;
  state: string;
  region: string;
  ipAddresses: {
    type: string;
    ipAddress: string;
  }[];
  databaseVersion: string;
  storageSize: number;
  multiAZ: boolean;
  primaryInstance?: string;
  connectionName?: string;
  settings?: {
    tier: string;
    availabilityType: string;
    dataDiskSizeGb: string;
  };
}

export interface GCPCredentials {
  clientEmail: string;
  privateKey: string;
}

export function initializeCloudSQLClient(credentials: GCPCredentials): sqladmin_v1beta4.Sqladmin {
  const privateKey = credentials.privateKey.split(String.raw`\n`).join('\n');
  const authClient = new auth.JWT({
    email: credentials.clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });

  return new sqladmin_v1beta4.Sqladmin({
    auth: authClient
  });
}

export async function listCloudSQLInstances(
  client: sqladmin_v1beta4.Sqladmin,
  gcpProjectId: string
): Promise<CloudSQLInstanceInfo[]> {
  try {
    const response = await client.instances.list({
      project: gcpProjectId
    });

    if (!response.data.items) {
      return [];
    }

    return response.data.items
      .filter((instance: sqladmin_v1beta4.Schema$DatabaseInstance) =>
        // Filter for PostgreSQL instances
        instance.databaseVersion?.includes('POSTGRES')
      )
      .map((instance: sqladmin_v1beta4.Schema$DatabaseInstance) => ({
        name: instance.name || '',
        id: instance.instanceType || '',
        engine: 'postgres', // CloudSQL calls it POSTGRES but we'll normalize to match RDS
        engineVersion: extractPostgresVersion(instance.databaseVersion || ''),
        tier: instance.settings?.tier || '',
        state: instance.state || '',
        region: instance.region || '',
        ipAddresses: (instance.ipAddresses || []).map((ip: sqladmin_v1beta4.Schema$IpMapping) => ({
          type: ip.type || '',
          ipAddress: ip.ipAddress || ''
        })),
        databaseVersion: instance.databaseVersion || '',
        storageSize: Number(instance.settings?.dataDiskSizeGb || 0),
        multiAZ: instance.settings?.availabilityType === 'REGIONAL',
        primaryInstance: instance.masterInstanceName ? instance.masterInstanceName : undefined,
        connectionName: instance.connectionName || undefined,
        settings: instance.settings
          ? {
              tier: instance.settings.tier || '',
              availabilityType: instance.settings.availabilityType || '',
              dataDiskSizeGb: String(instance.settings.dataDiskSizeGb || '0')
            }
          : undefined
      }));
  } catch (error) {
    console.error('Error fetching CloudSQL instances:', error);
    return [];
  }
}

// Helper function to extract the actual PostgreSQL version from GCP format
function extractPostgresVersion(databaseVersion: string): string {
  // GCP format is like 'POSTGRES_14' or 'POSTGRES_9_6'
  const match = databaseVersion.match(/POSTGRES_(\d+(?:_\d+)?)/i);
  if (!match || !match[1]) return '';

  // Convert 14 to 14.0 or 9_6 to 9.6
  return match[1].replace('_', '.');
}

export async function getCloudSQLInstanceDetails(
  client: sqladmin_v1beta4.Sqladmin,
  gcpProjectId: string,
  instanceName: string
): Promise<CloudSQLInstanceInfo | null> {
  try {
    const response = await client.instances.get({
      project: gcpProjectId,
      instance: instanceName
    });

    const instance = response.data;
    if (!instance) {
      return null;
    }

    return {
      name: instance.name || '',
      id: instance.instanceType || '',
      engine: 'postgres',
      engineVersion: extractPostgresVersion(instance.databaseVersion || ''),
      tier: instance.settings?.tier || '',
      state: instance.state || '',
      region: instance.region || '',
      ipAddresses: (instance.ipAddresses || []).map((ip) => ({
        type: ip.type || '',
        ipAddress: ip.ipAddress || ''
      })),
      databaseVersion: instance.databaseVersion || '',
      storageSize: Number(instance.settings?.dataDiskSizeGb || 0),
      multiAZ: instance.settings?.availabilityType === 'REGIONAL',
      primaryInstance: instance.masterInstanceName ? instance.masterInstanceName : undefined,
      connectionName: instance.connectionName || undefined,
      settings: instance.settings
        ? {
            tier: instance.settings.tier || '',
            availabilityType: instance.settings.availabilityType || '',
            dataDiskSizeGb: String(instance.settings.dataDiskSizeGb || '0')
          }
        : undefined
    };
  } catch (error) {
    console.error('Error fetching CloudSQL instance details:', error);
    return null;
  }
}
