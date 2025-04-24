import { generateObject } from 'ai';
import fs from 'fs';
import path from 'path';
import { afterAll, beforeAll, describe } from 'vitest';
import { z } from 'zod';
import { evalChat } from '~/evals/lib/chat-runner';
import { getModelInstance } from '~/lib/ai/agent';
import { env } from '~/lib/env/eval';
import { PostgresConfig, runSql, startPostgresContainer } from '../lib/eval-docker-db';
import { mockGetConnectionInfo, mockGetProjectsById } from '../lib/mocking';
import { evalResultEnum } from '../lib/schemas';
import { ensureTraceFolderExistsExpect } from '../lib/test-id';
import { stepToHuman } from '../lib/trace';
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

type LLMJudgeConfig = {
  prompt: (args: { input: string; steps: string[]; finalAnswer: string }) => string;
  name: string;
};

const finalAnswerJudge = (expectedAnswer = ''): LLMJudgeConfig => ({
  name: 'final_answer',
  prompt: ({ input, finalAnswer }) => `
  The following question was answered by an expert in PostgreSQL and database administration:
  <question>${input}</question>
  <expertAnswer>${finalAnswer}</expertAnswer>
  ${expectedAnswer ? `<expectedAnswer>${expectedAnswer}</expectedAnswer>` : ''} 
  Please determine whether expert passed or failed at answering the question correctly and accurately. Please provied a critique of how the answer could be improved or does not match the response of an expert in PostgreSQl and database administration.
  `
});

const conciseAnswerJudge: LLMJudgeConfig = {
  name: 'concise',
  prompt: ({ input, finalAnswer }) => `
  The following question was answered by an expert in PostgreSQL and database administration:
    <question>${input}</question>
    <answer>${finalAnswer}</answer>

  Please determine whether expert passed or failed at answering the question concisely with no extra information offered unless it's explicitly asked for in the question or it's almost certain from the question the user would want it. Please provied a critique of how the answer could be improved or does not match the resp`
};

type LLMJudgeEval = EvalCase & { prompt: string; judge: LLMJudgeConfig };

describe.concurrent('judge', () => {
  const evalCases: LLMJudgeEval[] = [
    {
      id: 'tables_in_db',
      prompt: 'What tables do I have in my db?',
      judges: [finalAnswerJudge('dogs'), conciseAnswerJudge]
    },
    {
      id: 'tables_in_db_how_many',
      prompt: 'How many tables do I have in my db?',
      judges: [finalAnswerJudge('1'), conciseAnswerJudge]
    }
  ].flatMap((evalCase) =>
    evalCase.judges.map((judge) => ({
      id: `${judge.name}_${evalCase.id}`,
      prompt: evalCase.prompt,
      judge: judge
    }))
  );

  runEvals(evalCases, async ({ prompt, judge }, { expect }) => {
    const traceFolder = ensureTraceFolderExistsExpect(expect);
    const result = await evalChat({
      messages: [{ role: 'user', content: prompt }],
      dbConnection: dbConfig.connectionString,
      expect
    });

    const humanSteps = result.steps.map(stepToHuman);
    const finalAnswer = result.text;
    const { object: judgeResponse } = await generateObject({
      model: await getModelInstance(env.JUDGE_MODEL),
      schema: z.object({
        result: evalResultEnum,
        critique: z.string()
      }),
      prompt: judge.prompt({ input: prompt, steps: humanSteps, finalAnswer })
    });
    const judgeResponseFile = path.join(traceFolder, 'judgeResponse.txt');
    fs.writeFileSync(judgeResponseFile, judgeResponse.critique);

    expect(judgeResponse.result).toEqual('passed');
  });
});
