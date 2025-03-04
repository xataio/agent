import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { openai } from '@ai-sdk/openai';
import { LanguageModelV1, Tool } from 'ai';
import { Client } from 'pg';
import { z } from 'zod';
import {
  findTableSchema,
  getPerformanceAndVacuumSettings,
  getPostgresExtensions,
  getTablesAndInstanceInfo
} from '~/lib/tools/dbinfo';
import { getInstanceLogs } from '~/lib/tools/logs';
import { getClusterMetric } from '~/lib/tools/metrics';
import { getPlaybook, listPlaybooks } from '~/lib/tools/playbooks';
import {
  describeTable,
  explainQuery,
  getSlowQueries,
  toolCurrentActiveQueries,
  toolGetQueriesWaitingOnLocks,
  toolGetVacuumStats
} from '~/lib/tools/slow-queries';
import { Connection } from '../db/connections';

export const commonSystemPrompt = `
You are an AI assistant expert in PostgreSQL and database administration.
Your name is Aida.
Always answer SUCCINCTLY and to the point.
Be CONCISE.
`;

export const chatSystemPrompt = `${commonSystemPrompt}
Provide clear, concise, and accurate responses to questions.
Use the provided tools to get context from the PostgreSQL database to answer questions.
When asked why a query is slow, call the explainQuery tool and also take into account the table sizes.
During the initial assessment use the getTablesAndInstanceInfo, getPerfromanceAndVacuumSettings, 
and getPostgresExtensions tools. 
When asked to run a playbook, use the getPlaybook tool to get the playbook contents. Then use the contents of the playbook
as an action plan. Execute the plan step by step.
`;

export const monitoringSystemPrompt = `${commonSystemPrompt}
You are now executing a periodic monitoring task.
You are provided with a playbook name and a set of tools that you can use to execute the playbook.
First thing you need to do is call the getPlaybook tool to get the playbook contents.
Then use the contents of the playbook as an action plan. Execute the plan step by step.
At the end of your execution, print a summary of the results.
`;

export async function getTools(connection: Connection, targetClient: Client): Promise<Record<string, Tool>> {
  return {
    getCurrentTime: {
      description: 'Get the current time',
      parameters: z.object({}),
      execute: async () => {
        const now = new Date();
        return now.toLocaleTimeString();
      }
    },
    getSlowQueries: {
      description: `Get a list of slow queries formatted as a JSON array. Contains how many times the query was called,
the max execution time in seconds, the mean execution time in seconds, the total execution time
(all calls together) in seconds, and the query itself.`,
      parameters: z.object({}),
      execute: async () => {
        const slowQueries = await getSlowQueries(targetClient, 5000);
        return JSON.stringify(slowQueries);
      }
    },
    explainQuery: {
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
        const explain = await explainQuery(targetClient, schema, query);
        if (explain) {
          return explain;
        } else {
          return 'Could not run EXPLAIN on the query';
        }
      }
    },
    describeTable: {
      description: `Describe a table. If you know the schema, pass it as a parameter. If you don't, use public.`,
      parameters: z.object({
        schema: z.string(),
        table: z.string()
      }),
      execute: async ({ schema, table }) => {
        if (!schema) {
          schema = 'public';
        }
        return await describeTable(targetClient, schema, table);
      }
    },
    findTableSchema: {
      description: `Find the schema of a table. Use this tool to find the schema of a table.`,
      parameters: z.object({
        table: z.string()
      }),
      execute: async ({ table }) => {
        return await findTableSchema(targetClient, table);
      }
    },
    getTablesAndInstanceInfo: {
      description: `Get the information about tables (sizes, row counts, usage) and the data about server
instance/cluster on which the DB is running. Useful during the initial assessment.`,
      parameters: z.object({}),
      execute: async () => {
        return await getTablesAndInstanceInfo(connection);
      }
    },
    getPerformanceAndVacuumSettings: {
      description: `Get the performance and vacuum settings for the database.`,
      parameters: z.object({}),
      execute: async () => {
        return await getPerformanceAndVacuumSettings(connection);
      }
    },
    getPostgresExtensions: {
      description: `Get the available and installed PostgreSQL extensions for the database.`,
      parameters: z.object({}),
      execute: async () => {
        return await getPostgresExtensions(connection);
      }
    },
    getInstanceLogs: {
      description: `Get the recent logs (last 24 hours) from the RDS instance.`,
      parameters: z.object({}),
      execute: async () => {
        return await getInstanceLogs(connection);
      }
    },
    getInstanceMetric: {
      description: `Get the metrics for the RDS instance.`,
      parameters: z.object({
        metricName: z.string(),
        periodInSeconds: z.number()
      }),
      execute: async ({ metricName, periodInSeconds }) => {
        console.log('getClusterMetric', metricName, periodInSeconds);
        return await getClusterMetric(connection, metricName, periodInSeconds);
      }
    },
    getCurrentActiveQueries: {
      description: `Get the currently active queries.`,
      parameters: z.object({}),
      execute: async () => {
        return await toolCurrentActiveQueries(connection.connectionString);
      }
    },
    getQueriesWaitingOnLocks: {
      description: `Get the queries that are currently blocked waiting on locks.`,
      parameters: z.object({}),
      execute: async () => {
        return await toolGetQueriesWaitingOnLocks(connection.connectionString);
      }
    },
    getVacuumStats: {
      description: `Get the vacuum stats for the top tables in the database. They are sorted by the number of dead tuples descending.`,
      parameters: z.object({}),
      execute: async () => {
        return await toolGetVacuumStats(connection.connectionString);
      }
    },
    getPlaybook: {
      description: `Get a playbook contents by name. A playbook is a list of steps to follow to achieve a goal. Follow it step by step.`,
      parameters: z.object({
        name: z.string()
      }),
      execute: async ({ name }) => {
        return getPlaybook(name);
      }
    },
    listPlaybooks: {
      description: `List the available playbooks.`,
      parameters: z.object({}),
      execute: async () => {
        return listPlaybooks();
      }
    }
  };
}

export function getModelInstance(model: string): LanguageModelV1 {
  if (model.startsWith('openai-')) {
    return openai(model.replace('openai-', ''));
  } else if (model.startsWith('deepseek-')) {
    return deepseek(model);
  } else if (model.startsWith('anthropic-')) {
    return anthropic(model.replace('anthropic-', ''));
  } else {
    throw new Error('Invalid model');
  }
}
