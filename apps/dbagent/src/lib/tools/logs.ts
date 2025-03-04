import { getRDSClusterLogs, getRDSInstanceLogs, initializeRDSClient } from '../aws/rds';
import { getClusterByConnection } from '../db/clusters';
import { DbConnection } from '../db/connections';
import { getIntegration } from '../db/integrations';

export async function getInstanceLogs(connection: DbConnection): Promise<string> {
  // Get AWS credentials from integrations
  const awsCredentials = await getIntegration('aws');
  if (!awsCredentials) {
    return 'AWS credentials not configured';
  }

  const cluster = await getClusterByConnection(connection.id);
  if (!cluster) {
    return 'Cluster not found';
  }

  // Initialize RDS client
  const rdsClient = initializeRDSClient(awsCredentials, cluster.region);

  // Get logs from the last 24 hours
  let logs = [];
  if (!cluster.data.isStandaloneInstance) {
    logs = await getRDSClusterLogs(cluster.clusterIdentifier, rdsClient);
  } else {
    logs = await getRDSInstanceLogs(cluster.clusterIdentifier, rdsClient);
  }

  if (logs.length === 0) {
    return 'No logs found for the last 24 hours';
  }

  // Combine all logs with timestamps
  return logs.join('\n\n');
}
