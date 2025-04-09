import { tool, Tool } from 'ai';
import { z } from 'zod';
import { Connection } from '~/lib/db/connections';
import { DBAccess } from '~/lib/db/db';
import { CloudProviderType } from '~/lib/db/projects';
import { getPostgresExtensions, getTablesAndInstanceInfo } from '~/lib/tools/dbinfo';
import { getInstanceLogsGCP, getInstanceLogsRDS } from '~/lib/tools/logs';
import { getClusterMetricGCP, getClusterMetricRDS } from '~/lib/tools/metrics';
import { mergeToolsets, Toolset, ToolsetGroup } from './types';

export function getDBClusterTools(
  dbAccess: DBAccess,
  connection: Connection,
  cloudProvider: CloudProviderType
): Record<string, Tool> {
  const connectionGetter = () => Promise.resolve({ connection });
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
  #getter: () => Promise<{ connection: Connection }>;

  constructor(dbAccess: DBAccess, getter: () => Promise<{ connection: Connection }>) {
    this.#dbAccess = dbAccess;
    this.#getter = getter;
  }

  toolset(): Record<string, Tool> {
    return {
      getTablesAndInstanceInfo: this.getTablesAndInstanceInfo(),
      getPostgresExtensions: this.getPostgresExtensions()
    };
  }

  private getTablesAndInstanceInfo(): Tool {
    const getter = this.#getter;
    const db = this.#dbAccess;
    return tool({
      description: `Get the information about tables (sizes, row counts, usage)
      and the data about server instance/cluster on which the DB is running.
      Useful during the initial assessment.`,
      parameters: z.object({}),
      execute: async () => {
        const { connection } = await getter();
        return await getTablesAndInstanceInfo(db, connection);
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
        const { connection } = await getter();
        return await getPostgresExtensions(db, connection);
      }
    });
  }
}

export class AWSDBClusterTools implements ToolsetGroup {
  #dbAccess: DBAccess;
  #getter: () => Promise<{ connection: Connection }>;

  constructor(dbAccess: DBAccess, getter: () => Promise<{ connection: Connection }>) {
    this.#dbAccess = dbAccess;
    this.#getter = getter;
  }

  toolset(): Record<string, Tool> {
    return {
      getInstanceLogs: this.getInstanceLogsRDS(),
      getInstanceMetric: this.getInstanceMetricRDS()
    };
  }

  private getInstanceLogsRDS(): Tool {
    const getter = this.#getter;
    const db = this.#dbAccess;
    return tool({
      description: `Get the recent logs from the RDS instance. You can specify the period in seconds and optionally grep for a substring.`,
      parameters: z.object({
        periodInSeconds: z.number(),
        grep: z.string().optional()
      }),
      execute: async ({ periodInSeconds, grep }) => {
        console.log('getInstanceLogs', periodInSeconds, grep);
        const { connection } = await getter();
        return await getInstanceLogsRDS(db, { connection, periodInSeconds, grep });
      }
    });
  }

  private getInstanceMetricRDS(): Tool {
    const getter = this.#getter;
    const db = this.#dbAccess;
    return tool({
      description: `Get the metrics for the RDS instance. You can specify the period in seconds.`,
      parameters: z.object({
        metricName: z.string(),
        periodInSeconds: z.number()
      }),
      execute: async ({ metricName, periodInSeconds }) => {
        console.log('getClusterMetric', metricName, periodInSeconds);
        const { connection } = await getter();
        return await getClusterMetricRDS(db, { connection, metricName, periodInSeconds });
      }
    });
  }
}

export class GCPDBClusterTools implements ToolsetGroup {
  #dbAccess: DBAccess;
  #getter: () => Promise<{ connection: Connection }>;

  constructor(dbAccess: DBAccess, getter: () => Promise<{ connection: Connection }>) {
    this.#dbAccess = dbAccess;
    this.#getter = getter;
  }

  toolset(): Record<string, Tool> {
    return {
      getInstanceLogs: this.getInstanceLogsGCP(),
      getInstanceMetric: this.getInstanceMetricGCP()
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
        const { connection } = await getter();
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
        const { connection } = await getter();
        return await getClusterMetricGCP(db, { connection, metricName, periodInSeconds });
      }
    });
  }
}
