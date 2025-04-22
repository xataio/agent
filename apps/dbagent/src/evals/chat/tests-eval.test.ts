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
    dbConfig = await startPostgresContainer({ port: 9889 });
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
  await dbConfig.close();
});

type Test = EvalCase & {
  prompt: string;
  finalAnswerRegex: RegExp;
};

describe.concurrent('test', () => {
  const evalCases: Test[] = [
    {
      id: 'tables_in_db',
      prompt: 'What tables do I have in my db? Please place the answer <answer>here</answer>',
      finalAnswerRegex: /dogs/
    },
    {
      id: 'table_size',
      prompt: 'What is the size of the dogs table?',
      finalAnswerRegex: /24\s*kB/
    },
    {
      id: 'tables_schema',
      prompt: 'What schema is the dogs table in?',
      finalAnswerRegex: /public/
    }
  ];
  runEvals(evalCases, async ({ prompt, finalAnswerRegex }, { expect }) => {
    const result = await evalChat({
      messages: [{ role: 'user', content: prompt }],
      dbConnection: dbConfig.connectionString,
      expect
    });

    const finalAnswer = result.text;

    expect(finalAnswer).toMatch(finalAnswerRegex);
  });
});
