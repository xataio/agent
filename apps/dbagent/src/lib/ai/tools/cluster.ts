import { tool, Tool } from 'ai';
import { z } from 'zod';
import { getClusterByConnection } from '~/lib/db/aws-clusters';
import { DBAccess } from '~/lib/db/db';
import { getInstanceByConnection } from '~/lib/db/gcp-instances';
import { AWSCluster, CloudProvider, Connection, GCPInstance } from '~/lib/db/schema';
import { getPostgresExtensions, getTablesInfo } from '~/lib/tools/dbinfo';
import { getInstanceLogsGCP, getInstanceLogsRDS } from '~/lib/tools/logs';
import { getClusterMetricGCP, getClusterMetricRDS } from '~/lib/tools/metrics';

export interface ClusterService {
  type: 'aws' | 'gcp' | 'other';
  getTablesInfo(): Promise<string>;
  getPostgresExtensions(): Promise<string>;
}

export interface AWSProjectClusterService extends ClusterService {
  type: 'aws';
  getInstanceLogs({ periodInSeconds, grep }: { periodInSeconds: number; grep?: string }): Promise<string>;
  getInstanceMetric({
    metricName,
    periodInSeconds,
    stat
  }: {
    metricName: string;
    periodInSeconds: number;
    stat: 'Average' | 'Maximum' | 'Minimum' | 'Sum';
  }): Promise<string>;
  getClusterInfo(): Promise<AWSCluster | null>;
}

export interface GCPProjectClusterService extends ClusterService {
  type: 'gcp';
  getInstanceLogs({ periodInSeconds, grep }: { periodInSeconds: number; grep?: string }): Promise<string>;
  getInstanceMetric({ metricName, periodInSeconds }: { metricName: string; periodInSeconds: number }): Promise<string>;
  getInstanceInfo(): Promise<GCPInstance | null>;
}

export function getDBClusterTools(tools: ClusterService): Record<string, Tool> {
  switch (tools.type) {
    case 'aws':
      return awsDBClusterTools(tools as AWSProjectClusterService);
    case 'gcp':
      return gpcDBClusterTools(tools as GCPProjectClusterService);
    default:
      return commonDBClusterTools(tools);
  }
}

export function getProjectClusterService(
  dbAccess: DBAccess,
  connection: Connection | (() => Promise<Connection>),
  cloudProvider: CloudProvider
): ClusterService {
  if (cloudProvider === 'aws') {
    return awsProjectClusterTools(dbAccess, connection);
  } else if (cloudProvider === 'gcp') {
    return gcpProjectClusterTools(dbAccess, connection);
  } else {
    const getter = typeof connection === 'function' ? connection : () => Promise.resolve(connection);
    return {
      type: 'other',
      getTablesInfo: async () => await getTablesInfo(dbAccess, await getter()),
      getPostgresExtensions: async () => await getPostgresExtensions(dbAccess, await getter())
    };
  }
}

export function commonDBClusterTools(clusterTools: ClusterService): Record<string, Tool> {
  return {
    getTablesInfo: tool({
      description: `Get the information about tables (sizes, row counts, usage).`,
      parameters: z.object({}),
      execute: async () => clusterTools.getTablesInfo()
    }),
    getPostgresExtensions: tool({
      description: `Get the available and installed PostgreSQL extensions for the database.`,
      parameters: z.object({}),
      execute: async () => clusterTools.getPostgresExtensions()
    })
  };
}

export function createAWSDBClusterTools(awsClusterTools: AWSProjectClusterService): Record<string, Tool> {
  return {
    getInstanceLogs: tool({
      description: `Get the recent logs from the RDS instance. You can specify the period in seconds and optionally grep for a substring. 
      If you don't want to grep for a substring, you can pass an empty string.`,
      parameters: z.object({
        periodInSeconds: z.number(),
        grep: z.string()
      }),
      execute: async ({ periodInSeconds, grep }) => {
        console.log('getInstanceLogs', periodInSeconds, grep);
        return await awsClusterTools.getInstanceLogs({ periodInSeconds, grep });
      }
    }),
    getInstanceMetric: tool({
      description: `Get the metrics for the RDS instance. If this is a cluster, the metric is read from the current writer instance.
      You can specify the period in seconds. The stat parameter is one of the following: Average, Maximum, Minimum, Sum.`,
      parameters: z.object({
        metricName: z.string(),
        periodInSeconds: z.number(),
        stat: z.enum(['Average', 'Maximum', 'Minimum', 'Sum'])
      }),
      execute: async ({ metricName, periodInSeconds, stat }) => {
        console.log('getClusterMetric', metricName, periodInSeconds);
        return await awsClusterTools.getInstanceMetric({ metricName, periodInSeconds, stat });
      }
    }),
    getClusterInfo: tool({
      description: `Get the information about the RDS cluster or instance.`,
      parameters: z.object({}),
      execute: async () => {
        return await awsClusterTools.getClusterInfo();
      }
    })
  };
}

export function awsDBClusterTools(awsClusterTools: AWSProjectClusterService): Record<string, Tool> {
  const commonTools = commonDBClusterTools(awsClusterTools);
  return {
    ...commonTools,
    getInstanceLogs: tool({
      description: `Get the recent logs from the RDS instance. You can specify the period in seconds and optionally grep for a substring. 
        If you don't want to grep for a substring, you can pass an empty string.`,
      parameters: z.object({
        periodInSeconds: z.number(),
        grep: z.string()
      }),
      execute: async ({ periodInSeconds, grep }) => {
        console.log('getInstanceLogs', periodInSeconds, grep);
        return await awsClusterTools.getInstanceLogs({ periodInSeconds, grep });
      }
    }),
    getInstanceMetric: tool({
      description: `Get the metrics for the RDS instance. If this is a cluster, the metric is read from the current writer instance.
        You can specify the period in seconds. The stat parameter is one of the following: Average, Maximum, Minimum, Sum.`,
      parameters: z.object({
        metricName: z.string(),
        periodInSeconds: z.number(),
        stat: z.enum(['Average', 'Maximum', 'Minimum', 'Sum'])
      }),
      execute: async ({ metricName, periodInSeconds, stat }) => {
        console.log('getClusterMetric', metricName, periodInSeconds);
        return await awsClusterTools.getInstanceMetric({ metricName, periodInSeconds, stat });
      }
    }),
    getClusterInfo: tool({
      description: `Get the information about the RDS cluster or instance.`,
      parameters: z.object({}),
      execute: async () => {
        return await awsClusterTools.getClusterInfo();
      }
    })
  };
}

export function awsProjectClusterTools(
  dbAccess: DBAccess,
  connection: Connection | (() => Promise<Connection>)
): AWSProjectClusterService {
  const getter = typeof connection === 'function' ? connection : () => Promise.resolve(connection);

  return {
    type: 'aws',
    getTablesInfo: async () => await getTablesInfo(dbAccess, await getter()),
    getPostgresExtensions: async () => await getPostgresExtensions(dbAccess, await getter()),
    getInstanceLogs: async ({ periodInSeconds, grep }) => {
      const connection = await getter();
      return await getInstanceLogsRDS(dbAccess, { connection, periodInSeconds, grep });
    },
    getInstanceMetric: async ({ metricName, periodInSeconds, stat }) => {
      const connection = await getter();
      return getClusterMetricRDS(dbAccess, { connection, metricName, periodInSeconds, stat });
    },
    getClusterInfo: async () => {
      const connection = await getter();
      return await getClusterByConnection(dbAccess, connection.id);
    }
  };
}

export function gpcDBClusterTools(gcpProjectClusterTools: GCPProjectClusterService): Record<string, Tool> {
  const commonTools = commonDBClusterTools(gcpProjectClusterTools);
  return {
    ...commonTools,
    getInstanceLogs: tool({
      description: `Get the recent logs from a GCP CloudSQL instance. You can specify the period in seconds and optionally grep for a substring.`,
      parameters: z.object({
        periodInSeconds: z.number(),
        grep: z.string().optional()
      }),
      execute: async ({ periodInSeconds, grep }) => {
        console.log('getInstanceLogs', periodInSeconds, grep);
        return await gcpProjectClusterTools.getInstanceLogs({ periodInSeconds, grep });
      }
    }),
    getInstanceMetric: tool({
      description: `Get the metrics for the GCP Cloud SQL instance. You can specify the period in seconds.
        The metric name MUST be a valid Cloud SQL metric name. Common CloudSQL metrics are:
        - cloudsql.googleapis.com/database/cpu/utilization
        - cloudsql.googleapis.com/database/memory/utilization
        - cloudsql.googleapis.com/database/disk/utilization
        - cloudsql.googleapis.com/database/disk/write_ops_count
        - cloudsql.googleapis.com/database/disk/read_ops_count      
        - cloudsql.googleapis.com/database/memory/total_usage
        - cloudsql.googleapis.com/database/postgresql/num_backends
        - cloudsql.googleapis.com/database/postgresql/new_connection_count
        - cloudsql.googleapis.com/database/postgresql/deadlock_count
        - cloudsql.googleapis.com/database/postgresql/write_ahead_log/written_bytes_count
        `,
      parameters: z.object({
        metricName: z.string(),
        periodInSeconds: z.number()
      }),
      execute: async ({ metricName, periodInSeconds }) => {
        console.log('getClusterMetricGCP', metricName, periodInSeconds);
        return await gcpProjectClusterTools.getInstanceMetric({ metricName, periodInSeconds });
      }
    }),
    getInstanceInfo: tool({
      description: `Get the information about the GCP Cloud SQL instance.`,
      parameters: z.object({}),
      execute: async () => {
        return await gcpProjectClusterTools.getInstanceInfo();
      }
    })
  };
}

export function gcpProjectClusterTools(
  dbAccess: DBAccess,
  connection: Connection | (() => Promise<Connection>)
): GCPProjectClusterService {
  const getter = typeof connection === 'function' ? connection : () => Promise.resolve(connection);

  return {
    type: 'gcp',
    getTablesInfo: async () => await getTablesInfo(dbAccess, await getter()),
    getPostgresExtensions: async () => await getPostgresExtensions(dbAccess, await getter()),
    getInstanceLogs: async ({ periodInSeconds, grep }) => {
      const connection = await getter();
      return await getInstanceLogsGCP(dbAccess, { connection, periodInSeconds, grep });
    },
    getInstanceMetric: async ({ metricName, periodInSeconds }) => {
      const connection = await getter();
      return await getClusterMetricGCP(dbAccess, { connection, metricName, periodInSeconds });
    },
    getInstanceInfo: async () => {
      const connection = await getter();
      return await getInstanceByConnection(dbAccess, connection.id);
    }
  };
}
