import { afterAll, beforeAll, describe, expect } from 'vitest';
import { evalChat } from '~/evals/lib/chat-runner';
import { PostgresConfig, runSql, startPostgresContainer } from '../lib/eval-docker-db';
import { mockGetConnectionInfo, mockGetProjectsById } from '../lib/mocking';
import { EvalCase, runEvals } from '../lib/vitest-helpers';

let dbConfig: PostgresConfig;
beforeAll(async () => {
  mockGetProjectsById();
  mockGetConnectionInfo();

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

describe('tool_choice', () => {
  const testCases: ToolChoiceEval[] = [
    {
      id: 'tool_choice_tables_in_db',
      prompt: 'What tables do I have in my db?',
      toolCalls: ['getTablesAndInstanceInfo'],
      only: true
    },
    {
      id: 'tool_choice_how_many_tables',
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
