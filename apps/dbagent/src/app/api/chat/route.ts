import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { openai } from '@ai-sdk/openai';
import { LanguageModelV1, streamText } from 'ai';
import { z } from 'zod';
import { getConnection } from '~/lib/db/connections';
import { getTargetDbConnection } from '~/lib/targetdb/db';
import {
  findTableSchema,
  getPerformanceAndVacuumSettings,
  getPostgresExtensions,
  getTablesAndInstanceInfo
} from '~/lib/tools/dbinfo';
import { getInstanceLogs } from '~/lib/tools/logs';
import { getClusterMetric } from '~/lib/tools/metrics';
import { getPlaybook, listPlaybooks } from '~/lib/tools/playbooks';
import { describeTable, explainQuery, getSlowQueries } from '~/lib/tools/slow-queries';

export const runtime = 'nodejs';
export const maxDuration = 30;

const systemPrompt = `
You are an AI assistant expert in PostgreSQL and database administration.
Your name is Maki AI DBA.
Provide clear, concise, and accurate responses to questions.
Use the provided tools to get context from the PostgreSQL database to answer questions.
When asked why a query is slow, call the explainQuery tool and also take into account the table sizes.
Always answer SUCCINCTLY and to the point.
Be CONCISE.
During the initial assessment use the getTablesAndInstanceInfo, getPerfromanceAndVacuumSettings, 
and getPostgresExtensions tools. 
When asked to run a playbook, use the getPlaybook tool to get the playbook contents. Then use the contents of the playbook
as an action plan. Execute the plan step by step.
`;

export function errorHandler(error: unknown) {
  if (error == null) {
    return 'unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  console.log(JSON.stringify(error));

  return JSON.stringify(error);
}

export async function POST(req: Request) {
  const { messages, connectionId, model } = await req.json();

  const connection = await getConnection(connectionId);
  if (!connection) {
    return new Response('Connection not found', { status: 404 });
  }
  const targetClient = await getTargetDbConnection(connection.connstring);

  const context = systemPrompt;

  console.log(context);

  let modelInstance: LanguageModelV1;
  if (model.startsWith('openai-')) {
    modelInstance = openai(model.replace('openai-', ''));
  } else if (model.startsWith('deepseek-')) {
    modelInstance = deepseek(model);
  } else if (model.startsWith('anthropic-')) {
    modelInstance = anthropic(model.replace('anthropic-', ''));
  } else {
    throw new Error('Invalid model');
  }

  const result = streamText({
    model: modelInstance,
    messages,
    system: context,
    tools: {
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
    },
    maxSteps: 20,
    toolCallStreaming: true
  });

  return result.toDataStreamResponse({
    getErrorMessage: errorHandler
  });
}
