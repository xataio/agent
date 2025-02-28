import { getRDSClusterMetric } from '../aws/rds';
import { DbConnection } from '../db/connections';
import { getIntegration } from '../db/integrations';
import { getProjectById } from '../db/projects';

export async function getClusterMetric(
  connection: DbConnection,
  metricName: string,
  periodInSeconds: number
): Promise<string> {
  const awsCredentials = await getIntegration('aws');
  if (!awsCredentials) {
    return 'AWS credentials not configured';
  }

  const project = await getProjectById(connection.projectId);
  if (project?.type !== 'rds') {
    return 'Project is not an RDS cluster';
  }

  const startTime = new Date(Date.now() - periodInSeconds * 1000);
  const endTime = new Date();

  try {
    const datapoints = await getRDSClusterMetric(
      project.info.clusterIdentifier,
      project.info.region,
      awsCredentials,
      metricName,
      startTime,
      endTime
    );

    const toReturn = datapoints
      .map((datapoint) => `${datapoint.timestamp.toISOString()}: ${datapoint.value}`)
      .join('\n');
    console.log('metric result', toReturn);
    return toReturn;
  } catch (error) {
    console.error('Error fetching RDS cluster metric', error);
    return 'Error fetching RDS cluster metric';
  }
}
