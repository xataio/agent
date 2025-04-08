import { tool, Tool } from 'ai';
import { z } from 'zod';
import { Connection } from '~/lib/db/connections';
import { DBAccess } from '~/lib/db/db';
import { getPostgresExtensions, getTablesAndInstanceInfo } from '~/lib/tools/dbinfo';
import { getInstanceLogs } from '~/lib/tools/logs';
import { getClusterMetric } from '~/lib/tools/metrics';
import { ToolsetGroup } from './types';

export function getDBClusterTools(dbAccess: DBAccess, connection: Connection): Record<string, Tool> {
  return new DBClusterTools(dbAccess, () => Promise.resolve(connection)).toolset();
}

// The DBClusterTools toolset provides agent tools for accessing information about AWS RDS instance and cluster.
export class DBClusterTools implements ToolsetGroup {
  #dbAccess: DBAccess;
  #getter: () => Promise<Connection>;

  constructor(dbAccess: DBAccess, getter: () => Promise<Connection>) {
    this.#dbAccess = dbAccess;
    this.#getter = getter;
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
    const getter = this.#getter;
    const db = this.#dbAccess;
    return tool({
      description: `Get the information about tables (sizes, row counts, usage)
      and the data about server instance/cluster on which the DB is running.
      Useful during the initial assessment.`,
      parameters: z.object({}),
      execute: async () => {
        const connection = await getter();
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
        const connection = await getter();
        return await getPostgresExtensions(db, connection);
      }
    });
  }

  private getInstanceLogs(): Tool {
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
        const connection = await getter();
        return await getInstanceLogs(db, { connection, periodInSeconds, grep });
      }
    });
  }

  private getInstanceMetric(): Tool {
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
        const connection = await getter();
        return await getClusterMetric(db, { connection, metricName, periodInSeconds });
      }
    });
  }
}
