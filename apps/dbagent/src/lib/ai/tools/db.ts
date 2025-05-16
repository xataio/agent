import { Tool, tool } from 'ai';
import { z } from 'zod';
import { toolFindTableSchema } from '~/lib/tools/dbinfo';
import { toolDescribeTable, toolExplainQuery, toolGetSlowQueries } from '~/lib/tools/slow-queries';
import {
  toolCurrentActiveQueries,
  toolGetConnectionsGroups,
  toolGetConnectionsStats,
  toolGetQueriesWaitingOnLocks,
  toolGetVacuumStats
} from '~/lib/tools/stats';

import { getPerformanceSettings, getVacuumSettings, Pool, withPoolConnection } from '~/lib/targetdb/db';

type DBToolsProps = {
  db: DBService;
};

export interface DBService {
  slowQueries(thresholdMs: number): Promise<string>;
  explainQuery(schema: string, query: string): Promise<string>;
  describeTable(schema: string, table: string): Promise<string>;
  findTableSchema(table: string): Promise<string>;
  currentActiveQueries(): Promise<string>;
  queriesWaitingOnLocks(): Promise<string>;
  vacuumStats(): Promise<string>;
  connectionsStats(): Promise<string>;
  connectionsGroups(): Promise<string>;
  getPerformanceAndVacuumSettings(): Promise<string>;
}

export function getDBSQLTools(props: DBToolsProps): Record<string, Tool> {
  return {
    getSlowQueries: getSlowQueries(props),
    explainQuery: explainQuery(props),
    describeTable: describeTable(props),
    findTableSchema: findTableSchema(props),
    getCurrentActiveQueries: getCurrentActiveQueries(props),
    getQueriesWaitingOnLocks: getQueriesWaitingOnLocks(props),
    getVacuumStats: getVacuumStats(props),
    getConnectionsStats: getConnectionsStats(props),
    getConnectionsGroups: getConnectionsGroups(props),
    getPerformanceAndVacuumSettings: getPerformanceAndVacuumSettings(props)
  };
}

export function targetDBService(pool: Pool | (() => Promise<Pool>)): DBService {
  return {
    slowQueries: async (thresholdMs: number) =>
      await withPoolConnection(pool, async (client) => await toolGetSlowQueries(client, thresholdMs)),
    explainQuery: async (schema: string, query: string) =>
      await withPoolConnection(pool, async (client) => await toolExplainQuery(client, schema, query)),
    describeTable: async (schema: string, table: string) =>
      await withPoolConnection(pool, async (client) => await toolDescribeTable(client, schema, table)),
    findTableSchema: async (table: string) =>
      await withPoolConnection(pool, async (client) => await toolFindTableSchema(client, table)),
    currentActiveQueries: async () => await withPoolConnection(pool, toolCurrentActiveQueries),
    queriesWaitingOnLocks: async () => await withPoolConnection(pool, toolGetQueriesWaitingOnLocks),
    vacuumStats: async () => await withPoolConnection(pool, toolGetVacuumStats),
    connectionsStats: async () => await withPoolConnection(pool, toolGetConnectionsStats),
    connectionsGroups: async () => await withPoolConnection(pool, toolGetConnectionsGroups),
    getPerformanceAndVacuumSettings: async () =>
      await withPoolConnection(pool, async (client) => {
        const performanceSettings = await getPerformanceSettings(client);
        const vacuumSettings = await getVacuumSettings(client);
        return `
        Performance settings: ${JSON.stringify(performanceSettings)}
        Vacuum settings: ${JSON.stringify(vacuumSettings)}
      `;
      })
  };
}

function getSlowQueries({ db }: DBToolsProps): Tool {
  return tool({
    description: `Get a list of slow queries formatted as a JSON array. Contains how many times the query was called,
the max execution time in seconds, the mean execution time in seconds, the total execution time
(all calls together) in seconds, and the query itself.`,
    parameters: z.object({}),
    execute: async () => await db.slowQueries(2000)
  });
}

function explainQuery({ db }: DBToolsProps): Tool {
  return tool({
    description: `Run explain on a a query. Returns the explain plan as received from PostgreSQL.
The query needs to be complete, it cannot contain $1, $2, etc. If you need to, replace the parameters with your own made up values.
It's very important that $1, $2, etc. are not passed to this tool. Use the tool describeTable to get the types of the columns.
If you know the schema, pass it in as well.`,
    parameters: z.object({
      schema: z.string(),
      query: z.string()
    }),
    execute: async ({ schema = 'public', query }) => {
      const explain = await db.explainQuery(schema, query);
      if (!explain) return 'Could not run EXPLAIN on the query';
      return explain;
    }
  });
}

function describeTable({ db }: DBToolsProps): Tool {
  return tool({
    description: `Describe a table. If you know the schema, pass it as a parameter. If you don't, use public.`,
    parameters: z.object({
      schema: z.string(),
      table: z.string()
    }),
    execute: async ({ schema = 'public', table }) => await db.describeTable(schema, table)
  });
}

function findTableSchema({ db }: DBToolsProps): Tool {
  return tool({
    description: `Find the schema of a table. Use this tool to find the schema of a table.`,
    parameters: z.object({
      table: z.string()
    }),
    execute: async ({ table }) => await db.findTableSchema(table)
  });
}

function getCurrentActiveQueries({ db }: DBToolsProps): Tool {
  return tool({
    description: `Get the currently active queries.`,
    parameters: z.object({}),
    execute: async () => await db.currentActiveQueries()
  });
}

function getQueriesWaitingOnLocks({ db }: DBToolsProps): Tool {
  return tool({
    description: `Get the queries that are currently blocked waiting on locks.`,
    parameters: z.object({}),
    execute: async () => await db.queriesWaitingOnLocks()
  });
}

function getVacuumStats({ db }: DBToolsProps): Tool {
  return tool({
    description: `Get the vacuum stats for the top tables in the database. They are sorted by the number of dead tuples descending.`,
    parameters: z.object({}),
    execute: async () => await db.vacuumStats()
  });
}

function getConnectionsStats({ db }: DBToolsProps): Tool {
  return tool({
    description: `Get the connections stats for the database.`,
    parameters: z.object({}),
    execute: async () => await db.connectionsStats()
  });
}

function getConnectionsGroups({ db }: DBToolsProps): Tool {
  return tool({
    description: `Get the connections groups for the database. This is a view in the pg_stat_activity table, grouped by (state, user, application_name, client_addr, wait_event_type, wait_event).`,
    parameters: z.object({}),
    execute: async () => await db.connectionsGroups()
  });
}

function getPerformanceAndVacuumSettings({ db }: DBToolsProps): Tool {
  return tool({
    description: `Get the performance and vacuum settings for the database.`,
    parameters: z.object({}),
    execute: async () => await db.getPerformanceAndVacuumSettings()
  });
}
