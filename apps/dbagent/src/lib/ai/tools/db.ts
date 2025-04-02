import { Tool, tool } from 'ai';
import { z } from 'zod';
import { getPerformanceAndVacuumSettings, toolFindTableSchema } from '~/lib/tools/dbinfo';
import { toolDescribeTable, toolExplainQuery, toolGetSlowQueries } from '~/lib/tools/slow-queries';
import {
  toolCurrentActiveQueries,
  toolGetConnectionsGroups,
  toolGetConnectionsStats,
  toolGetQueriesWaitingOnLocks,
  toolGetVacuumStats
} from '~/lib/tools/stats';
import { ToolsetGroup } from './types';

export function getDBSQLTools(connString: string): DBSQLTools {
  return new DBSQLTools(connString);
}

// The DBSQLTools toolset provides tools for querying the postgres database
// directly via SQL to collect system performance information.
export class DBSQLTools implements ToolsetGroup {
  private _connstr: string;

  constructor(connString: string) {
    this._connstr = connString;
  }

  toolset(): Record<string, Tool> {
    return {
      getSlowQueries: this.getSlowQueries(),
      explainQuery: this.explainQuery(),
      describeTable: this.describeTable(),
      findTableSchema: this.findTableSchema(),
      getCurrentActiveQueries: this.getCurrentActiveQueries(),
      getQueriesWaitingOnLocks: this.getQueriesWaitingOnLocks(),
      getVacuumStats: this.getVacuumStats(),
      getConnectionsStats: this.getConnectionsStats(),
      getConnectionsGroups: this.getConnectionsGroups(),
      getPerformanceAndVacuumSettings: this.getPerformanceAndVacuumSettings()
    };
  }

  getSlowQueries(): Tool {
    const connstr = this._connstr;
    return tool({
      description: `Get a list of slow queries formatted as a JSON array. Contains how many times the query was called,
the max execution time in seconds, the mean execution time in seconds, the total execution time
(all calls together) in seconds, and the query itself.`,
      parameters: z.object({}),
      execute: async () => {
        console.log('getSlowQueries');
        const slowQueries = await toolGetSlowQueries(connstr, 2000);
        console.log('slowQueries', JSON.stringify(slowQueries));
        return JSON.stringify(slowQueries);
      }
    });
  }

  explainQuery(): Tool {
    const connstr = this._connstr;
    return tool({
      description: `Run explain on a a query. Returns the explain plan as received from PostgreSQL.
The query needs to be complete, it cannot contain $1, $2, etc. If you need to, replace the parameters with your own made up values.
It's very important that $1, $2, etc. are not passed to this tool. Use the tool describeTable to get the types of the columns.
If you know the schema, pass it in as well.`,
      parameters: z.object({
        schema: z.string(),
        query: z.string()
      }),
      execute: async ({ schema, query }) => {
        if (!schema) {
          schema = 'public';
        }
        const explain = await toolExplainQuery(connstr, schema, query);
        if (explain) {
          return explain;
        } else {
          return 'Could not run EXPLAIN on the query';
        }
      }
    });
  }

  describeTable(): Tool {
    const connstr = this._connstr;
    return tool({
      description: `Describe a table. If you know the schema, pass it as a parameter. If you don't, use public.`,
      parameters: z.object({
        schema: z.string(),
        table: z.string()
      }),
      execute: async ({ schema, table }) => {
        if (!schema) {
          schema = 'public';
        }
        return await toolDescribeTable(connstr, schema, table);
      }
    });
  }

  findTableSchema(): Tool {
    const connstr = this._connstr;
    return tool({
      description: `Find the schema of a table. Use this tool to find the schema of a table.`,
      parameters: z.object({
        table: z.string()
      }),
      execute: async ({ table }) => {
        return await toolFindTableSchema(connstr, table);
      }
    });
  }

  getCurrentActiveQueries(): Tool {
    const connstr = this._connstr;
    return tool({
      description: `Get the currently active queries.`,
      parameters: z.object({}),
      execute: async () => {
        return await toolCurrentActiveQueries(connstr);
      }
    });
  }

  getQueriesWaitingOnLocks(): Tool {
    const connstr = this._connstr;
    return tool({
      description: `Get the queries that are currently blocked waiting on locks.`,
      parameters: z.object({}),
      execute: async () => {
        return await toolGetQueriesWaitingOnLocks(connstr);
      }
    });
  }

  getVacuumStats(): Tool {
    const connstr = this._connstr;
    return tool({
      description: `Get the vacuum stats for the top tables in the database. They are sorted by the number of dead tuples descending.`,
      parameters: z.object({}),
      execute: async () => {
        return await toolGetVacuumStats(connstr);
      }
    });
  }

  getConnectionsStats(): Tool {
    const connstr = this._connstr;
    return tool({
      description: `Get the connections stats for the database.`,
      parameters: z.object({}),
      execute: async () => {
        return await toolGetConnectionsStats(connstr);
      }
    });
  }

  getConnectionsGroups(): Tool {
    const connstr = this._connstr;
    return tool({
      description: `Get the connections groups for the database. This is a view in the pg_stat_activity table, grouped by (state, user, application_name, client_addr, wait_event_type, wait_event).`,
      parameters: z.object({}),
      execute: async () => {
        return await toolGetConnectionsGroups(connstr);
      }
    });
  }

  getPerformanceAndVacuumSettings(): Tool {
    const connstr = this._connstr;
    return tool({
      description: `Get the performance and vacuum settings for the database.`,
      parameters: z.object({}),
      execute: async () => {
        return await getPerformanceAndVacuumSettings(connstr);
      }
    });
  }
}
