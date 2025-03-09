import { getRDSClusterLogs, getRDSInstanceLogs, initializeRDSClient } from '../aws/rds';
import { getClusterByConnection } from '../db/aws-clusters';
import { Connection } from '../db/connections';
import { getIntegration } from '../db/integrations';

type GetInstanceLogsParams = {
  connection: Connection;
  periodInSeconds: number;
  grep?: string;
  asUserId?: string;
};

export async function getInstanceLogs({
  connection,
  periodInSeconds,
  grep,
  asUserId
}: GetInstanceLogsParams): Promise<string> {
  // Get AWS credentials from integrations
  const awsCredentials = await getIntegration(connection.projectId, 'aws', asUserId);
  if (!awsCredentials) {
    return 'AWS credentials not configured';
  }

  const cluster = await getClusterByConnection(connection.id, asUserId);
  if (!cluster) {
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
    return 'No logs found for the last 24 hours';
  }

  // Combine all logs with timestamps
  return logs.join('\n\n');
}
