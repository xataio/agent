import { generateObject } from 'ai';
import fs from 'fs';
import path from 'path';
import { afterAll, beforeAll, describe } from 'vitest';
import { z } from 'zod';
import { evalChat } from '~/evals/lib/chat-runner';
import { getModelInstance } from '~/lib/ai/aidba';
import { env } from '~/lib/env/eval';
import { PostgresConfig, runSql, startPostgresContainer } from '../lib/eval-docker-db';
import { mockGetConnectionInfo, mockGetProjectsById } from '../lib/mocking';
import { evalResultEnum } from '../lib/schemas';
import { ensureTraceFolderExistsExpect } from '../lib/test-id';
import { EvalCase, runEvals } from '../lib/vitest-helpers';

let dbConfig: PostgresConfig;
beforeAll(async () => {
  mockGetProjectsById();
  mockGetConnectionInfo();
  try {
    dbConfig = await startPostgresContainer({ port: 9888 });
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

type LLMJudgeConfig = { prompt: (args: { input: string; output: string }) => string; model: string };

const defaultJudge: LLMJudgeConfig = {
  prompt: ({
    input,
    output
  }) => `Please evaluate whether this response from an expert in PostgreSQL and database administration. Answers should be concise and provide no additional information that isn't needed.

  Please evaluate whether the following question has been answered well.
  <question>${input}</question>
  <answer>${output}</question>

Suggest a critique of how the answer could be improved or does not match the response of an exper in PostgreSQl and database administration.
  `,
  model: env.JUDGE_MODEL
};

type LLMJudgeEval = EvalCase & { prompt: string; judge: LLMJudgeConfig };

describe.concurrent('llm_judge', () => {
  const evalCases: LLMJudgeEval[] = [
    {
      id: 'judge_tables_in_db',
      prompt: 'What tables do I have in my db?',
      only: true
    }
  ].map((evalCase) => ({ ...evalCase, judge: defaultJudge }));

  runEvals(evalCases, async ({ prompt, judge }, { expect }) => {
    const result = await evalChat({
      messages: [{ role: 'user', content: prompt }],
      dbConnection: dbConfig.connectionString,
      expect
    });

    const steps = JSON.stringify(result.steps, null, 2);

    const { object: judgeResponse } = await generateObject({
      model: getModelInstance(judge.model),
      schema: z.object({
        result: evalResultEnum,
        critique: z.string()
      }),
      prompt: judge.prompt({ input: prompt, output: steps })
    });
    const traceFolder = ensureTraceFolderExistsExpect(expect);
    const judgeResponseFile = path.join(traceFolder, 'judgeResponse.txt');
    fs.writeFileSync(judgeResponseFile, judgeResponse.critique);

    expect(judgeResponse.result).toEqual('passed');
  });
});
