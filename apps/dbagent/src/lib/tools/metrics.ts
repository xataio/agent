import { getRDSClusterMetric, getRDSInstanceMetric } from '../aws/rds';
import { getClusterByConnection } from '../db/aws-clusters';
import { DBAccess } from '../db/db';
import { getInstanceByConnection } from '../db/gcp-instances';
import { getIntegration } from '../db/integrations';
import { CloudProvider, Connection } from '../db/schema';
import { getCloudSQLInstanceMetric, initializeMonitoringClient } from '../gcp/cloudsql';

type GetClusterMetricParams = {
  connection: Connection;
  cloudProvider: CloudProvider;
  metricName: string;
  periodInSeconds: number;
  stat?: 'Average' | 'Maximum' | 'Minimum' | 'Sum';
};

export async function getClusterMetricRDS(
  dbAccess: DBAccess,
  { connection, metricName, periodInSeconds, stat }: Omit<GetClusterMetricParams, 'cloudProvider'>
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
        endTime,
        stat
      );
    } else {
      datapoints = await getRDSInstanceMetric(
        cluster.clusterIdentifier,
        cluster.region,
        awsCredentials,
        metricName,
        startTime,
        endTime,
        stat
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

export async function getClusterMetricGCP(
  dbAccess: DBAccess,
  { connection, metricName, periodInSeconds }: Omit<GetClusterMetricParams, 'cloudProvider'>
): Promise<string> {
  console.log('called getClusterMetricGCP');
  const gcpCredentials = await getIntegration(dbAccess, connection.projectId, 'gcp');
  if (!gcpCredentials) {
    return 'GCP credentials not configured';
  }

  console.log('GCP credentials');

  const client = initializeMonitoringClient(
    {
      clientEmail: gcpCredentials.clientEmail,
      privateKey: gcpCredentials.privateKey
    },
    gcpCredentials.gcpProjectId
  );
  console.log('Client created');

  const instance = await getInstanceByConnection(dbAccess, connection.id);
  if (!instance) {
    return 'Instance not found';
  }

  const startTime = new Date(Date.now() - periodInSeconds * 1000);
  const endTime = new Date();

  try {
    const datapoints = await getCloudSQLInstanceMetric(
      client,
      gcpCredentials.gcpProjectId,
      instance.instanceName,
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
    console.error('Error fetching GCP instance metric', error);
    return 'Error fetching GCP instance metric';
  }
}
