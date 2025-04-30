import { getRDSClusterLogs, getRDSInstanceLogs, initializeRDSClient } from '../aws/rds';
import { getClusterByConnection } from '../db/aws-clusters';
import { DBAccess } from '../db/db';
import { getInstanceByConnection } from '../db/gcp-instances';
import { getIntegration } from '../db/integrations';
import { Connection } from '../db/schema';
import { getCloudSQLPostgresLogs, initializeLoggingClient } from '../gcp/cloudsql';

type GetInstanceLogsParams = {
  connection: Connection;
  periodInSeconds: number;
  grep?: string;
};

export async function getInstanceLogsRDS(
  dbAccess: DBAccess,
  { connection, periodInSeconds, grep }: GetInstanceLogsParams
): Promise<string> {
  // Get AWS credentials from integrations
  const awsCredentials = await getIntegration(dbAccess, connection.projectId, 'aws');
  if (!awsCredentials) {
    return 'AWS credentials not configured';
  }

  const cluster = await getClusterByConnection(dbAccess, connection.id);
  if (!cluster) {
    console.log('Cluster not found for connection:', connection.id);
    return 'Cluster not found';
  }

  // Initialize RDS client
  const rdsClient = initializeRDSClient(awsCredentials, cluster.region);

  const startTime = new Date(Date.now() - periodInSeconds * 1000);

  // Get the recent logs from the RDS instance
  let logs = [];
  if (!cluster.data.isStandaloneInstance) {
    logs = await getRDSClusterLogs(cluster.clusterIdentifier, rdsClient, startTime);
  } else {
    logs = await getRDSInstanceLogs(cluster.clusterIdentifier, rdsClient, startTime);
  }

  // Filter logs if grep is provided
  if (grep) {
    logs = logs.filter((log) => log.includes(grep));
  }

  // Trim logs if total size exceeds 5KB
  const maxSize = 5 * 1024; // 5KB in bytes
  let totalSize = 0;
  const trimmedLogs = [];

  for (const log of logs) {
    totalSize += Buffer.byteLength(log, 'utf8');
    if (totalSize > maxSize) {
      // Add note about truncation
      trimmedLogs.push('\n[Log output truncated due to size limit...]');
      break;
    }
    trimmedLogs.push(log);
  }
  logs = trimmedLogs;

  if (logs.length === 0) {
    return 'No logs found for the given period';
  }

  // Combine all logs with timestamps
  return logs.join('\n\n');
}

export async function getInstanceLogsGCP(
  dbAccess: DBAccess,
  { connection, periodInSeconds, grep }: GetInstanceLogsParams
): Promise<string> {
  const gcpCredentials = await getIntegration(dbAccess, connection.projectId, 'gcp');
  if (!gcpCredentials) {
    return 'GCP credentials not configured';
  }

  const client = initializeLoggingClient(gcpCredentials, gcpCredentials.gcpProjectId);

  const startTime = new Date(Date.now() - periodInSeconds * 1000);

  const instance = await getInstanceByConnection(dbAccess, connection.id);
  if (!instance) {
    return 'Instance not found';
  }

  const logs = await getCloudSQLPostgresLogs(
    client,
    gcpCredentials.gcpProjectId,
    instance.instanceName,
    startTime,
    grep
  );

  // Convert logs to strings and track total size
  const maxSize = 5 * 1024; // 5KB
  let totalSize = 0;
  const trimmedLogs = [];

  for (const log of logs) {
    const logString = `${log.timestamp.toISOString()}: ${log.message}`;
    totalSize += Buffer.byteLength(logString, 'utf8');

    if (totalSize > maxSize) {
      // Add note about truncation
      trimmedLogs.push('\n[Log output truncated due to size limit...]');
      break;
    }
    trimmedLogs.push(logString);
  }

  if (trimmedLogs.length === 0) {
    return 'No logs found for the given period';
  }

  return trimmedLogs.join('\n');
}
