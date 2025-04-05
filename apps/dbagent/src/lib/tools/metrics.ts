import { getRDSClusterMetric, getRDSInstanceMetric } from '../aws/rds';
import { getClusterByConnection } from '../db/aws-clusters';
import { Connection } from '../db/connections';
import { getInstanceByConnection } from '../db/gcp-instances';
import { getIntegration } from '../db/integrations';
import { getCloudSQLInstanceMetric, initializeMonitoringClient } from '../gcp/cloudsql';

type GetClusterMetricParams = {
  connection: Connection;
  cloudProvider: 'aws' | 'gcp';
  metricName: string;
  periodInSeconds: number;
  asUserId?: string;
};

export async function getClusterMetricRDS({
  connection,
  metricName,
  periodInSeconds,
  asUserId
}: Omit<GetClusterMetricParams, 'cloudProvider'>): Promise<string> {
  const awsCredentials = await getIntegration(connection.projectId, 'aws', asUserId);
  if (!awsCredentials) {
    return 'AWS credentials not configured';
  }

  const cluster = await getClusterByConnection(connection.id, asUserId);
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

export async function getClusterMetricGCP({
  connection,
  metricName,
  periodInSeconds,
  asUserId
}: Omit<GetClusterMetricParams, 'cloudProvider'>): Promise<string> {
  console.log('called getClusterMetricGCP');
  const gcpCredentials = await getIntegration(connection.projectId, 'gcp', asUserId);
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

  const instance = await getInstanceByConnection(connection.id, asUserId);
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
