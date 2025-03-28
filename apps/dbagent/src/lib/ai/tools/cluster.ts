import { tool, Tool } from 'ai';
import { z } from 'zod';
import { Connection } from '~/lib/db/connections';
import { getPostgresExtensions, getTablesAndInstanceInfo } from '~/lib/tools/dbinfo';
import { getInstanceLogs } from '~/lib/tools/logs';
import { getClusterMetric } from '~/lib/tools/metrics';
import { ToolsetGroup } from './types';

export function getDBClusterTools(connection: Connection, asUserId?: string): Record<string, Tool> {
  return new DBClusterTools(() => Promise.resolve({ connection, asUserId })).toolset();
}

// The DBClusterTools toolset provides agent tools for accessing information about AWS RDS instance and cluster.
export class DBClusterTools implements ToolsetGroup {
  private _getter: () => Promise<{ connection: Connection; asUserId?: string }>;

  constructor(getter: () => Promise<{ connection: Connection; asUserId?: string }>) {
    this._getter = getter;
  }

  toolset(): Record<string, Tool> {
    return {
      getTablesAndInstanceInfo: this.getTablesAndInstanceInfo(),
      getPostgresExtensions: this.getPostgresExtensions(),
      getInstanceLogs: this.getInstanceLogs(),
      getInstanceMetric: this.getInstanceMetric()
    };
  }

  private getTablesAndInstanceInfo(): Tool {
    const getter = this._getter;
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
    const getter = this._getter;
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
    const getter = this._getter;
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

  private getInstanceMetric(): Tool {
    const getter = this._getter;
    return tool({
      description: `Get the metrics for the RDS instance. You can specify the period in seconds.`,
      parameters: z.object({
        metricName: z.string(),
        periodInSeconds: z.number()
      }),
      execute: async ({ metricName, periodInSeconds }) => {
        console.log('getClusterMetric', metricName, periodInSeconds);
        const { connection, asUserId } = await getter();
        return await getClusterMetric({ connection, metricName, periodInSeconds, asUserId });
      }
    });
  }
}
