import { afterAll, beforeAll, describe } from 'vitest';
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
      CREATE EXTENSION pg_stat_statements;
      -- slow query
      SELECT *, pg_sleep(5) FROM generate_series(1, 2);
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
      id: 'tables_which',
      prompt: 'What tables do I have in my db?',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'table_how_many',
      prompt: 'How many tables in my database?',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'table_with_most_rows',
      prompt: 'Which table has the most rows?',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'table_largest_size',
      prompt: 'Which table takes up the most space?',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'table_most_seq_scans',
      prompt: 'Which table has the most sequential scans?',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'table_most_idx_scans',
      prompt: 'Which table has the highest number of index scans?',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'table_most_inserts',
      prompt: 'Which table has had the most inserts?',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'table_most_updates',
      prompt: 'Identify the table with the highest number of updated rows.',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'table_most_deletes',
      prompt: 'Which table has the most deleted rows?',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'table_rows_in_specific_table',
      prompt: 'How many rows are in the dogs table?',
      expectedToolCalls: ['getTablesAndInstanceInfo'],
      allowOtherTools: false
    },
    {
      id: 'slow_queries',
      prompt: 'Which queries are running slowly?',
      expectedToolCalls: ['getSlowQueries'],
      allowOtherTools: true
    },
    {
      id: 'slow_queries_and_tables',
      prompt: 'Which tables have slow queries',
      expectedToolCalls: ['getSlowQueries'],
      allowOtherTools: true
    },
    {
      id: 'describe_table_with_schema',
      prompt: 'Describe the public.dogs table',
      expectedToolCalls: ['describeTable'],
      allowOtherTools: true
    },
    {
      id: 'describe_table_no_schema',
      prompt: 'Describe the dogs table',
      expectedToolCalls: ['describeTable'],
      allowOtherTools: true
    },
    {
      id: 'describe_table_indexes',
      prompt: 'What indexes are on the dogs table?',
      expectedToolCalls: ['describeTable'],
      allowOtherTools: true
    },
    {
      id: 'find_table_schema',
      prompt: 'What is the schema is the dogs table in?',
      expectedToolCalls: ['findTableSchema'],
      allowOtherTools: false
    },
    {
      id: 'performance_and_vacuum_settings_perf',
      prompt: 'What are the performance settings for the database?',
      expectedToolCalls: ['getPerformanceAndVacuumSettings'],
      allowOtherTools: false
    },
    {
      id: 'performance_and_vacuum_settings_vacuum',
      prompt: 'What are the vacuum settings for the database?',
      expectedToolCalls: ['getPerformanceAndVacuumSettings'],
      allowOtherTools: false
    },
    {
      id: 'postgres_extensions',
      prompt: 'What extensions are installed in the database?',
      expectedToolCalls: ['getPostgresExtensions'],
      allowOtherTools: false
    },
    {
      id: 'explain_query',
      prompt: 'Explain SELECT * FROM dogs',
      expectedToolCalls: ['explainQuery'],
      allowOtherTools: false
    },
    {
      id: 'vacuum_stats',
      prompt: 'What are teh vacuum stats for the database?',
      expectedToolCalls: ['getVacuumStats'],
      allowOtherTools: false
    }
  ];

  runEvals(testCases, async ({ prompt, expectedToolCalls: toolCalls, allowOtherTools }, { expect }) => {
    const result = await evalChat({
      messages: [{ role: 'user', content: prompt }],
      dbConnection: dbConfig.connectionString,
      expect
    });

    const allToolCalls = result.steps.flatMap((step) => step.toolCalls);
    const toolCallNames = allToolCalls.map((toolCall) => toolCall.toolName);
    expect(toolCallNames).toEqual(expect.arrayContaining(toolCalls));
    const unexpectedToolCalls = toolCallNames.filter((toolCall) => !toolCalls.includes(toolCall));
    if (!allowOtherTools) {
      expect(unexpectedToolCalls).toEqual([]);
    }
  });
});
