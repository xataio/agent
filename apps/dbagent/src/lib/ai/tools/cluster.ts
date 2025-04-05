import { tool, Tool } from 'ai';
import { z } from 'zod';
import { Connection } from '~/lib/db/connections';
import { Project } from '~/lib/db/projects';
import { getPostgresExtensions, getTablesAndInstanceInfo } from '~/lib/tools/dbinfo';
import { getInstanceLogs } from '~/lib/tools/logs';
import { getClusterMetricGCP, getClusterMetricRDS } from '~/lib/tools/metrics';
import { ToolsetGroup } from './types';

export function getDBClusterTools(project: Project, connection: Connection, asUserId?: string): Record<string, Tool> {
  return new DBClusterTools(project, () => Promise.resolve({ project, connection, asUserId })).toolset();
}

// The DBClusterTools toolset provides agent tools for accessing information about the cloud cluster or instance.
export class DBClusterTools implements ToolsetGroup {
  private _connection: () => Promise<{ project: Project; connection: Connection; asUserId?: string }>;
  private _project: Project;

  constructor(
    project: Project,
    getter: () => Promise<{ project: Project; connection: Connection; asUserId?: string }>
  ) {
    this._project = project;
    this._connection = getter;
  }

  toolset(): Record<string, Tool> {
    if (this._project.cloudProvider === 'aws') {
      return {
        getTablesAndInstanceInfo: this.getTablesAndInstanceInfo(),
        getPostgresExtensions: this.getPostgresExtensions(),
        getInstanceLogs: this.getInstanceLogs(),
        getInstanceMetric: this.getInstanceMetricRDS()
      };
    } else if (this._project.cloudProvider === 'gcp') {
      return {
        getTablesAndInstanceInfo: this.getTablesAndInstanceInfo(),
        getPostgresExtensions: this.getPostgresExtensions(),
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
    const getter = this._connection;
    return tool({
      description: `Get the information about tables (sizes, row counts, usage) and the data about server
instance/cluster on which the DB is running. Useful during the initial assessment.`,
      parameters: z.object({}),
      execute: async () => {
        const { connection, asUserId } = await getter();
        return await getTablesAndInstanceInfo(connection, asUserId);
      }
    });
  }

  private getPostgresExtensions(): Tool {
    const getter = this._connection;
    return tool({
      description: `Get the available and installed PostgreSQL extensions for the database.`,
      parameters: z.object({}),
      execute: async () => {
        const { connection, asUserId } = await getter();
        return await getPostgresExtensions(connection, asUserId);
      }
    });
  }

  private getInstanceLogs(): Tool {
    const getter = this._connection;
    return tool({
      description: `Get the recent logs from the RDS instance. You can specify the period in seconds and optionally grep for a substring.`,
      parameters: z.object({
        periodInSeconds: z.number(),
        grep: z.string().optional()
      }),
      execute: async ({ periodInSeconds, grep }) => {
        console.log('getInstanceLogs', periodInSeconds, grep);
        const { connection, asUserId } = await getter();
        return await getInstanceLogs({ connection, periodInSeconds, grep, asUserId });
      }
    });
  }

  private getInstanceMetricRDS(): Tool {
    const getter = this._connection;
    return tool({
      description: `Get the metrics for the RDS instance. You can specify the period in seconds.`,
      parameters: z.object({
        metricName: z.string(),
        periodInSeconds: z.number()
      }),
      execute: async ({ metricName, periodInSeconds }) => {
        console.log('getClusterMetricRDS', metricName, periodInSeconds);
        const { connection, asUserId } = await getter();
        return await getClusterMetricRDS({ connection, metricName, periodInSeconds, asUserId });
      }
    });
  }

  private getInstanceMetricGCP(): Tool {
    const getter = this._connection;
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
        const { connection, asUserId } = await getter();
        return await getClusterMetricGCP({ connection, metricName, periodInSeconds, asUserId });
      }
    });
  }
}
