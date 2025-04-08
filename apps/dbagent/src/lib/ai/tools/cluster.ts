import { tool, Tool } from 'ai';
import { z } from 'zod';
import { Connection } from '~/lib/db/connections';
import { Project } from '~/lib/db/projects';
import { DBAccess } from '~/lib/db/db';
import { getPostgresExtensions, getTablesAndInstanceInfo } from '~/lib/tools/dbinfo';
import { getInstanceLogsGCP, getInstanceLogsRDS } from '~/lib/tools/logs';
import { getClusterMetricGCP, getClusterMetricRDS } from '~/lib/tools/metrics';
import { ToolsetGroup } from './types';

export function getDBClusterTools(dbAccess: DBAccess, project: Project, connection: Connection): Record<string, Tool> {
  return new DBClusterTools(dbAccess, project, () => Promise.resolve({ project, connection })).toolset();
}

// The DBClusterTools toolset provides agent tools for accessing information about the cloud cluster or instance.
export class DBClusterTools implements ToolsetGroup {
  #project: Project;
  #dbAccess: DBAccess;
  #getter: () => Promise<{ project: Project; connection: Connection; asUserId?: string }>;


  constructor(
    dbAccess: DBAccess,
    project: Project,
    getter: () => Promise<{ project: Project; connection: Connection; asUserId?: string }>
  ) {
    this.#dbAccess = dbAccess;
    this.#project = project;
    this.#getter = getter;
  }

  toolset(): Record<string, Tool> {
    if (this.#project.cloudProvider === 'aws') {
      return {
        getTablesAndInstanceInfo: this.getTablesAndInstanceInfo(),
        getPostgresExtensions: this.getPostgresExtensions(),
        getInstanceLogs: this.getInstanceLogsRDS(),
        getInstanceMetric: this.getInstanceMetricRDS()
      };
    } else if (this.#project.cloudProvider === 'gcp') {
      return {
        getTablesAndInstanceInfo: this.getTablesAndInstanceInfo(),
        getPostgresExtensions: this.getPostgresExtensions(),
        getInstanceLogs: this.getInstanceLogsGCP(),
        getInstanceMetric: this.getInstanceMetricGCP()
      };
    } else {
      return {
        getTablesAndInstanceInfo: this.getTablesAndInstanceInfo(),
        getPostgresExtensions: this.getPostgresExtensions()
      };
    }
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