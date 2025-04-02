import { getRDSClusterMetric, getRDSInstanceMetric } from '../aws/rds';
import { getClusterByConnection } from '../db/aws-clusters';
import { Connection } from '../db/connections';
import { DBAccess } from '../db/db';
import { getIntegration } from '../db/integrations';

type GetClusterMetricParams = {
  connection: Connection;
  metricName: string;
  periodInSeconds: number;
};

export async function getClusterMetric(
  dbAccess: DBAccess,
  { connection, metricName, periodInSeconds }: GetClusterMetricParams
): Promise<string> {
  const awsCredentials = await getIntegration(dbAccess, connection.projectId, 'aws');
  if (!awsCredentials) {
    return 'AWS credentials not configured';
  }

  const cluster = await getClusterByConnection(dbAccess, connection.id);
  if (!cluster) {
    return 'Cluster not found';
  }

  const startTime = new Date(Date.now() - periodInSeconds * 1000);
  const endTime = new Date();

  try {
    let datapoints = [];
    if (!cluster.data.isStandaloneInstance) {
      datapoints = await getRDSClusterMetric(
        cluster.clusterIdentifier,
        cluster.region,
        awsCredentials,
        metricName,
        startTime,
        endTime
      );
    } else {
      datapoints = await getRDSInstanceMetric(
        cluster.clusterIdentifier,
        cluster.region,
        awsCredentials,
        metricName,
        startTime,
        endTime
      );
    }
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
