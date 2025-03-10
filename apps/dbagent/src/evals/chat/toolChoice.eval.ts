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
      );
      `,
      dbConfig
    );
  } catch (error) {
    console.error('Error starting postgres container', error);
    throw error;
  }
});

afterAll(async () => {
  await dbConfig.close();
});

type ToolChoiceEval = EvalCase & { prompt: string; expectedToolCalls: string[]; allowOtherTools: boolean };

describe.concurrent('tool_choice', () => {
  const testCases: ToolChoiceEval[] = [
    {
      id: 'tool_choice_tables_which',
      prompt: 'What tables do I have in my db?',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'tool_choice_table_how_many',
      prompt: 'How many tables in my database?',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'tool_choice_table_with_most_rows',
      prompt: 'Which table has the most rows?',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'tool_choice_table_largest_size',
      prompt: 'Which table takes up the most space?',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'tool_choice_table_most_seq_scans',
      prompt: 'Which table has the most sequential scans?',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'tool_choice_table_most_idx_scans',
      prompt: 'Which table has the highest number of index scans?',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'tool_choice_table_most_inserts',
      prompt: 'Which table has had the most inserts?',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'tool_choice_table_most_updates',
      prompt: 'Identify the table with the highest number of updated rows.',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'tool_choice_table_most_deletes',
      prompt: 'Which table has the most deleted rows?',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'tool_choice_rows_in_specific_table',
      prompt: 'How many rows are in the dogs table?',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    }
  ];
  runEvals(testCases, async ({ prompt, expectedToolCalls: toolCalls, allowOtherTools }) => {
    const result = await evalChat({
      messages: [{ role: 'user', content: prompt }],
      dbConnection: dbConfig.connectionString
    });

    const allToolCalls = result.steps.flatMap((step) => step.toolCalls);
    const toolCallNames = allToolCalls.map((toolCall) => toolCall.toolName);
    // @ts-ignore
    expect(toolCallNames).toContain(...toolCalls);
    const unexpectedToolCalls = toolCallNames.filter((toolCall) => !toolCalls.includes(toolCall));
    if (!allowOtherTools) {
      expect(unexpectedToolCalls).toEqual([]);
    }
  });
});
