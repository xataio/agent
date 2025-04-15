import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';

import {
  DescribeDBClustersCommand,
  DescribeDBInstancesCommand,
  DescribeDBLogFilesCommand,
  DownloadDBLogFilePortionCommand,
  RDSClient
} from '@aws-sdk/client-rds';

export interface RDSInstanceInfo {
  identifier: string;
  engine: string;
  engineVersion: string;
  instanceClass: string;
  status: string;
  endpoint?: {
    address: string;
    port: number;
  };
  allocatedStorage: number;
  multiAZ: boolean;
  dbClusterIdentifier?: string;
}

export interface RDSClusterInfo {
  identifier: string;
  engine: string;
  engineVersion: string;
  status: string;
  endpoint?: string;
  readerEndpoint?: string;
  port?: number;
  multiAZ: boolean;
  instanceCount: number;
  allocatedStorage?: number;
  isStandaloneInstance: boolean;
}

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export function initializeRDSClient(credentials: AWSCredentials, region?: string): RDSClient {
  if (!region) {
    region = credentials.region;
  }
  return new RDSClient({
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey
    },
    region: region
  });
}

export function initializeCloudWatchClient(credentials: AWSCredentials, region: string): CloudWatchClient {
  if (!region) {
    region = credentials.region;
  }
  return new CloudWatchClient({
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey
    },
    region: region
  });
}

export async function listRDSClusters(client: RDSClient): Promise<RDSClusterInfo[]> {
  // Get all DB clusters
  const command = new DescribeDBClustersCommand({});
  const response = await client.send(command);

  if (!response.DBClusters) {
    return [];
  }

  return response.DBClusters.map((cluster) => ({
    identifier: cluster.DBClusterIdentifier || '',
    engine: cluster.Engine || '',
    engineVersion: cluster.EngineVersion || '',
    status: cluster.Status || '',
    endpoint: cluster.Endpoint,
    readerEndpoint: cluster.ReaderEndpoint,
    port: cluster.Port,
    multiAZ: cluster.MultiAZ || false,
    instanceCount: cluster.DBClusterMembers?.length || 0,
    isStandaloneInstance: false
  }));
}

export interface RDSClusterDetailedInfo extends RDSClusterInfo {
  instances: RDSInstanceInfo[];
}

export async function getRDSClusterInfo(
  clusterIdentifier: string,
  client: RDSClient
): Promise<RDSClusterDetailedInfo | null> {
  try {
    // Get cluster details
    const clusterCommand = new DescribeDBClustersCommand({
      DBClusterIdentifier: clusterIdentifier
    });
    const clusterResponse = await client.send(clusterCommand);
    const cluster = clusterResponse.DBClusters?.[0];

    if (!cluster) {
      return null;
    }

    // Get all instances in the cluster
    const instanceCommand = new DescribeDBInstancesCommand({
      Filters: [
        {
          Name: 'db-cluster-id',
          Values: [clusterIdentifier]
        }
      ]
    });
    const instanceResponse = await client.send(instanceCommand);
    const instances = instanceResponse.DBInstances || [];

    // Map cluster and instance information
    return {
      identifier: cluster.DBClusterIdentifier || '',
      engine: cluster.Engine || '',
      engineVersion: cluster.EngineVersion || '',
      status: cluster.Status || '',
      endpoint: cluster.Endpoint,
      readerEndpoint: cluster.ReaderEndpoint,
      port: cluster.Port,
      multiAZ: cluster.MultiAZ || false,
      instanceCount: cluster.DBClusterMembers?.length || 0,
      isStandaloneInstance: false,
      instances: instances.map((instance) => ({
        identifier: instance.DBInstanceIdentifier || '',
        engine: instance.Engine || '',
        engineVersion: instance.EngineVersion || '',
        instanceClass: instance.DBInstanceClass || '',
        status: instance.DBInstanceStatus || '',
        endpoint: instance.Endpoint
          ? {
              address: instance.Endpoint.Address || '',
              port: instance.Endpoint.Port || 5432
            }
          : undefined,
        allocatedStorage: instance.AllocatedStorage || 0,
        multiAZ: instance.MultiAZ || false
      }))
    };
  } catch (error) {
    console.error('Error fetching RDS cluster info:', error);
    return null;
  }
}

export async function listRDSInstances(client: RDSClient): Promise<RDSInstanceInfo[]> {
  // Create command to list all DB instances
  const command = new DescribeDBInstancesCommand({});

  // Execute the command
  const response = await client.send(command);

  if (!response.DBInstances) {
    return [];
  }

  // Map each instance to our interface
  return response.DBInstances.map((instance) => ({
    identifier: instance.DBInstanceIdentifier || '',
    engine: instance.Engine || '',
    engineVersion: instance.EngineVersion || '',
    instanceClass: instance.DBInstanceClass || '',
    status: instance.DBInstanceStatus || '',
    endpoint: instance.Endpoint
      ? {
          address: instance.Endpoint.Address || '',
          port: instance.Endpoint.Port || 5432
        }
      : undefined,
    allocatedStorage: instance.AllocatedStorage || 0,
    multiAZ: instance.MultiAZ || false,
    dbClusterIdentifier: instance.DBClusterIdentifier || undefined
  }));
}

export async function getRDSInstanceInfo(
  instanceIdentifier: string,
  client: RDSClient
): Promise<RDSInstanceInfo | null> {
  try {
    // Create command to describe the specific DB instance
    const command = new DescribeDBInstancesCommand({
      DBInstanceIdentifier: instanceIdentifier
    });

    // Execute the command
    const response = await client.send(command);

    // Get the instance details
    const instance = response.DBInstances?.[0];

    if (!instance) {
      return null;
    }

    // Map the response to our interface
    return {
      identifier: instance.DBInstanceIdentifier || '',
      engine: instance.Engine || '',
      engineVersion: instance.EngineVersion || '',
      instanceClass: instance.DBInstanceClass || '',
      status: instance.DBInstanceStatus || '',
      endpoint: instance.Endpoint
        ? {
            address: instance.Endpoint.Address || '',
            port: instance.Endpoint.Port || 5432
          }
        : undefined,
      allocatedStorage: instance.AllocatedStorage || 0,
      multiAZ: instance.MultiAZ || false,
      dbClusterIdentifier: instance.DBClusterIdentifier || undefined
    };
  } catch (error) {
    console.error('Error fetching RDS instance info:', error);
    return null;
  }
}

export async function getRDSClusterLogs(
  clusterIdentifier: string,
  client: RDSClient,
  startTime: Date = new Date(Date.now() - 1 * 60 * 60 * 1000)
): Promise<string[]> {
  console.log('Getting logs for cluster:', clusterIdentifier);
  try {
    // Get the cluster details to find the writer instance
    const describeClusterCommand = new DescribeDBClustersCommand({
      DBClusterIdentifier: clusterIdentifier
    });

    const clusterResponse = await client.send(describeClusterCommand);
    const cluster = clusterResponse.DBClusters?.[0];

    if (!cluster || !cluster.DBClusterMembers || cluster.DBClusterMembers.length === 0) {
      console.error('No instances found in cluster:', clusterIdentifier);
      return [];
    }

    // Find the writer instance
    const writerMember = cluster.DBClusterMembers.find((member) => member.IsClusterWriter === true);

    if (!writerMember || !writerMember.DBInstanceIdentifier) {
      console.error('No writer instance found in cluster:', clusterIdentifier);
      return [];
    }

    // Get logs from the writer instance of the cluster
    const logs = await getRDSInstanceLogs(writerMember.DBInstanceIdentifier, client, startTime);
    console.log('logs length', logs.length);
    return logs;
  } catch (error) {
    console.error('Error fetching RDS cluster logs:', error);
    return [];
  }
}

export async function getRDSInstanceLogs(
  instanceIdentifier: string,
  client: RDSClient,
  startTime: Date = new Date(Date.now() - 24 * 60 * 60 * 1000) // Default to last 24 hours
): Promise<string[]> {
  try {
    console.log('Getting logs for instance:', instanceIdentifier);
    // First get the log file names
    const describeLogsCommand = new DescribeDBLogFilesCommand({
      DBInstanceIdentifier: instanceIdentifier,
      FileLastWritten: Math.floor(startTime.getTime())
    });

    const logFiles = await client.send(describeLogsCommand);

    if (!logFiles.DescribeDBLogFiles?.length) {
      return [];
    }

    // Download contents of each log file
    const logPromises = logFiles.DescribeDBLogFiles.map(async (logFile) => {
      const downloadCommand = new DownloadDBLogFilePortionCommand({
        DBInstanceIdentifier: instanceIdentifier,
        LogFileName: logFile.LogFileName,
        Marker: '0' // Start from beginning
      });

      const logContent = await client.send(downloadCommand);
      return logContent.LogFileData || '';
    });

    const logs = await Promise.all(logPromises);
    // Split each log file content into lines and flatten the array
    const logLines = logs
      .filter((log) => log.length > 0)
      .flatMap((log) => log.split('\n'))
      .filter((line) => line.trim().length > 0); // Remove empty lines
    return logLines;
  } catch (error) {
    console.error('Error fetching RDS logs:', error);
    return [];
  }
}

export async function getRDSClusterMetric(
  clusterIdentifier: string,
  region: string,
  credentials: AWSCredentials,
  metricName: string,
  startTime: Date = new Date(Date.now() - 24 * 60 * 60 * 1000), // Default to last 24 hours
  endTime: Date = new Date(),
  stat: 'Average' | 'Maximum' | 'Minimum' | 'Sum' = 'Average'
): Promise<{ timestamp: Date; value: number }[]> {
  try {
    const rdsClient = initializeRDSClient(credentials, region);
    const describeClusterCommand = new DescribeDBClustersCommand({
      DBClusterIdentifier: clusterIdentifier
    });

    const clusterResponse = await rdsClient.send(describeClusterCommand);
    const cluster = clusterResponse.DBClusters?.[0];

    if (!cluster || !cluster.DBClusterMembers || cluster.DBClusterMembers.length === 0) {
      console.error('No instances found in cluster:', clusterIdentifier);
      return [];
    }

    // Find the writer instance
    const writerMember = cluster.DBClusterMembers.find((member) => member.IsClusterWriter === true);

    if (!writerMember || !writerMember.DBInstanceIdentifier) {
      console.error('No writer instance found in cluster:', clusterIdentifier);
      return [];
    }

    // Now get metrics for the writer instance
    return await getRDSInstanceMetric(
      writerMember.DBInstanceIdentifier,
      region,
      credentials,
      metricName,
      startTime,
      endTime,
      stat
    );
  } catch (error) {
    console.error('Error fetching RDS cluster metric:', error);
    return [];
  }
}

export async function getRDSInstanceMetric(
  instanceIdentifier: string,
  region: string,
  credentials: AWSCredentials,
  metricName: string,
  startTime: Date,
  endTime: Date,
  stat: 'Average' | 'Maximum' | 'Minimum' | 'Sum' = 'Average'
): Promise<{ timestamp: Date; value: number }[]> {
  try {
    // Calculate time difference in seconds
    const timeDiffSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    // Target around 50 data points
    let period = 3600; // Default to 1 hour
    if (timeDiffSeconds <= 500) {
      // Up to ~8 minutes
      period = 10; // 10 second intervals
    } else if (timeDiffSeconds <= 3600) {
      // Up to ~60 minutes
      period = 60; // 1 minute intervals
    } else if (timeDiffSeconds <= 43200) {
      // Up to ~12 hours
      period = 300; // 5 minute intervals
    }

    const client = initializeCloudWatchClient(credentials, region);
    const command = new GetMetricStatisticsCommand({
      Namespace: 'AWS/RDS',
      MetricName: metricName,
      Dimensions: [
        {
          Name: 'DBInstanceIdentifier',
          Value: instanceIdentifier
        }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: period,
      Statistics: [stat]
    });

    console.log('command', JSON.stringify(command, null, 2));

    const response = await client.send(command);

    if (!response.Datapoints?.length) {
      return [];
    }

    return response.Datapoints.map((point) => ({
      timestamp: point.Timestamp || new Date(),
      value:
        (stat === 'Average'
          ? point.Average
          : stat === 'Maximum'
            ? point.Maximum
            : stat === 'Minimum'
              ? point.Minimum
              : point.Sum) || 0
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  } catch (error) {
    console.error(`Error fetching RDS instance metric ${metricName}:`, error);
    return [];
  }
}
