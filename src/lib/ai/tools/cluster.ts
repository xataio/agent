import { tool, Tool } from 'ai';
import { z } from 'zod';
import { getClusterByConnection } from '~/lib/db/aws-clusters';
import { DBAccess } from '~/lib/db/db';
import { getInstanceByConnection } from '~/lib/db/gcp-instances';
import { CloudProvider, Connection } from '~/lib/db/schema';
import { getPostgresExtensions, getTablesInfo } from '~/lib/tools/dbinfo';
import { getInstanceLogsGCP, getInstanceLogsRDS } from '~/lib/tools/logs';
import { getClusterMetricGCP, getClusterMetricRDS } from '~/lib/tools/metrics';
import { mergeToolsets, Toolset, ToolsetGroup } from './types';
export function getDBClusterTools(
  dbAccess: DBAccess,
  connection: Connection | (() => Promise<Connection>),
  cloudProvider: CloudProvider
): Record<string, Tool> {
  const connectionGetter = typeof connection === 'function' ? connection : () => Promise.resolve(connection);
  const toolset: Toolset[] = [new CommonDBClusterTools(dbAccess, connectionGetter)];

  if (cloudProvider === 'aws') {
    toolset.push(new AWSDBClusterTools(dbAccess, connectionGetter));
  } else if (cloudProvider === 'gcp') {
    toolset.push(new GCPDBClusterTools(dbAccess, connectionGetter));
  }
  return mergeToolsets(...toolset);
}

export class CommonDBClusterTools implements ToolsetGroup {
  #dbAccess: DBAccess;
  #getter: () => Promise<Connection>;

  constructor(dbAccess: DBAccess, getter: () => Promise<Connection>) {
    this.#dbAccess = dbAccess;
    this.#getter = getter;
  }

  toolset(): Record<string, Tool> {
    return {
      getTablesInfo: this.getTablesInfo(),
      getPostgresExtensions: this.getPostgresExtensions()
    };
  }

  private getTablesInfo(): Tool {
    const getter = this.#getter;
    const db = this.#dbAccess;
    return tool({
      description: `Get the information about tables (sizes, row counts, usage).`,
      parameters: z.object({}),
      execute: async () => {
        const connection = await getter();
        return await getTablesInfo(db, connection);
      }
    });
  }

  private getPostgresExtensions(): Tool {
    const getter = this.#getter;
    const db = this.#dbAccess;
    return tool({
      description: `Get the available and installed PostgreSQL extensions for the database.`,
      parameters: z.object({}),
      execute: async () => {
        const connection = await getter();
        return await getPostgresExtensions(db, connection);
      }
    });
  }
}

export class AWSDBClusterTools implements ToolsetGroup {
  #dbAccess: DBAccess;
  #getter: () => Promise<Connection>;

  constructor(dbAccess: DBAccess, getter: () => Promise<Connection>) {
    this.#dbAccess = dbAccess;
    this.#getter = getter;
  }

  toolset(): Record<string, Tool> {
    return {
      getInstanceLogs: this.getInstanceLogsRDS(),
      getInstanceMetric: this.getInstanceMetricRDS(),
      getClusterInfo: this.getClusterInfo()
    };
  }

  private getInstanceLogsRDS(): Tool {
    const getter = this.#getter;
    const db = this.#dbAccess;
    return tool({
      description: `Get the recent logs from the RDS instance. You can specify the period in seconds and optionally grep for a substring. 
      If you don't want to grep for a substring, you can pass an empty string.`,
      parameters: z.object({
        periodInSeconds: z.number(),
        grep: z.string()
      }),
      execute: async ({ periodInSeconds, grep }) => {
        console.log('getInstanceLogs', periodInSeconds, grep);
        const connection = await getter();
        return await getInstanceLogsRDS(db, { connection, periodInSeconds, grep });
      }
    });
  }

  private getInstanceMetricRDS(): Tool {
    const getter = this.#getter;
    const db = this.#dbAccess;
    return tool({
      description: `Get the metrics for the RDS instance. If this is a cluster, the metric is read from the current writer instance.
      You can specify the period in seconds. The stat parameter is one of the following: Average, Maximum, Minimum, Sum.`,
      parameters: z.object({
        metricName: z.string(),
        periodInSeconds: z.number(),
        stat: z.enum(['Average', 'Maximum', 'Minimum', 'Sum'])
      }),
      execute: async ({ metricName, periodInSeconds, stat }) => {
        console.log('getClusterMetric', metricName, periodInSeconds);
        const connection = await getter();
        return await getClusterMetricRDS(db, { connection, metricName, periodInSeconds, stat });
      }
    });
  }

  private getClusterInfo(): Tool {
    const getter = this.#getter;
    const db = this.#dbAccess;
    return tool({
      description: `Get the information about the RDS cluster or instance.`,
      parameters: z.object({}),
      execute: async () => {
        const connection = await getter();
        return await getClusterByConnection(db, connection.id);
      }
    });
  }
}

export class GCPDBClusterTools implements ToolsetGroup {
  #dbAccess: DBAccess;
  #getter: () => Promise<Connection>;

  constructor(dbAccess: DBAccess, getter: () => Promise<Connection>) {
    this.#dbAccess = dbAccess;
    this.#getter = getter;
  }

  toolset(): Record<string, Tool> {
    return {
      getInstanceLogs: this.getInstanceLogsGCP(),
      getInstanceMetric: this.getInstanceMetricGCP(),
      getInstanceInfo: this.getInstanceInfo()
    };
  }

  private getInstanceLogsGCP(): Tool {
    const getter = this.#getter;
    const db = this.#dbAccess;
    return tool({
      description: `Get the recent logs from a GCP CloudSQL instance. You can specify the period in seconds and optionally grep for a substring.`,
      parameters: z.object({
        periodInSeconds: z.number(),
        grep: z.string().optional()
      }),
      execute: async ({ periodInSeconds, grep }) => {
        console.log('getInstanceLogs', periodInSeconds, grep);
        const connection = await getter();
        return await getInstanceLogsGCP(db, { connection, periodInSeconds, grep });
      }
    });
  }

  private getInstanceMetricGCP(): Tool {
    const getter = this.#getter;
    const db = this.#dbAccess;

    return tool({
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
        const connection = await getter();
        return await getClusterMetricGCP(db, { connection, metricName, periodInSeconds });
      }
    });
  }

  private getInstanceInfo(): Tool {
    const getter = this.#getter;
    const db = this.#dbAccess;
    return tool({
      description: `Get the information about the GCP Cloud SQL instance.`,
      parameters: z.object({}),
      execute: async () => {
        const connection = await getter();
        return await getInstanceByConnection(db, connection.id);
      }
    });
  }
}
