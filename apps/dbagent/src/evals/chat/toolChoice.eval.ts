import { afterAll, beforeAll, describe, expect, vi } from 'vitest';
import { evalChat } from '~/evals/lib/chatRunner';
import * as connectionInfoExports from '~/lib/db/connection-info';
import * as projectsExports from '~/lib/db/projects';
import { PostgresConfig, runSql, startPostgresContainer } from '../lib/evalDockerDb';
import { EvalCase, runEvals } from '../lib/vitestHelpers';

vi.spyOn(projectsExports, 'getProjectById').mockImplementation(async (id) => {
  return { success: true, project: { id, ownerId: 'ownerId', name: 'project name' } };
});

vi.spyOn(connectionInfoExports, 'getConnectionInfo').mockImplementation(async (connectionId, key) => {
  if (key === 'tables') {
    return [
      {
        name: 'dogs',
        schema: 'public',
        rows: 150,
        size: '24 kB',
        seqScans: 45,
        idxScans: 120,
        nTupIns: 200,
        nTupUpd: 50,
        nTupDel: 10
      }
    ];
  }
  return null;
});

let dbConfig: PostgresConfig;
beforeAll(async () => {
  try {
    dbConfig = await startPostgresContainer();
    await runSql(
      `create table dogs (
          id serial primary key,
          name text
      );`,
      dbConfig
    );
  } catch (error) {
    console.error('Error starting postgres container', error);
    throw error;
  }
});

afterAll(async () => {
  if (dbConfig.container) {
    await dbConfig.container.stop();
    await dbConfig.container.remove();
  }
});

type ToolChoiceEval = EvalCase & { prompt: string; toolCalls: string[] };

describe('tool choice', () => {
  const testCases: ToolChoiceEval[] = [
    {
      id: 'tables_in_db',
      prompt: 'What tables do I have in my db?',
      toolCalls: ['getTablesAndInstanceInfo']
    },
    {
      id: 'how_many_tables',
      prompt: 'How many tables in my database?',
      toolCalls: ['getTablesAndInstanceInfo']
    }
  ];
  runEvals(testCases, async ({ prompt, toolCalls }) => {
    const result = await evalChat({
      messages: [{ role: 'user', content: prompt }],
      dbConnection: dbConfig.connectionString
    });

    const allToolCalls = result.steps.flatMap((step) => step.toolCalls);
    const toolCallNames = allToolCalls.map((toolCall) => toolCall.toolName);
    expect(toolCallNames).toEqual(toolCalls);
  });
});
