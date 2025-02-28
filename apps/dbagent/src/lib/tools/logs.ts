import { getRDSClusterLogs, initializeRDSClient } from '../aws/rds';
import { DbConnection } from '../db/connections';
import { getIntegration } from '../db/integrations';
import { getProjectById } from '../db/projects';

export async function getInstanceLogs(connection: DbConnection): Promise<string> {
  // Get AWS credentials from integrations
  const awsCredentials = await getIntegration('aws');
  if (!awsCredentials) {
    return 'AWS credentials not configured';
  }

  const cluster = await getProjectById(connection.projectId);
  if (cluster?.type !== 'rds') {
    return 'Project is not an RDS cluster';
  }

  // Initialize RDS client
  const rdsClient = initializeRDSClient(awsCredentials, cluster.info.region);

  // Get logs from the last 24 hours
  const logs = await getRDSClusterLogs(cluster.info.clusterIdentifier, rdsClient);

  if (logs.length === 0) {
    return 'No logs found for the last 24 hours';
  }

  // Combine all logs with timestamps
  return logs.join('\n\n');
}
