import { generateObject } from 'ai';
import fs from 'fs';
import path from 'path';
import { afterAll, beforeAll, describe, expect, vi } from 'vitest';
import { z } from 'zod';
import { evalChat } from '~/evals/lib/chatRunner';
import { getModelInstance } from '~/lib/ai/aidba';
import * as connectionInfoExports from '~/lib/db/connection-info';
import * as projectsExports from '~/lib/db/projects';
import { PostgresConfig, runSql, startPostgresContainer } from '../lib/evalDockerDb';
import { evalResultEnum } from '../lib/schemas';
import { ensureTraceFolderExists } from '../lib/testId';
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

type LLMJudgeConfig = { prompt: ({ input: string, output: string }) => string; model: string };

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
  model: 'anthropic-claude-3-5-sonnet-20241022'
};

type LLMJudgeEval = EvalCase & { prompt: string; judge: LLMJudgeConfig };

describe('llm_judge', () => {
  const evalCases: LLMJudgeEval[] = [
    {
      id: 'tables_in_db',
      prompt: 'What tables do I have in my db?',
      only: true
    }
  ].map((evalCase) => ({ ...evalCase, judge: defaultJudge }));

  runEvals(evalCases, async ({ prompt, judge }) => {
    const result = await evalChat({
      messages: [{ role: 'user', content: prompt }],
      dbConnection: dbConfig.connectionString
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
    const traceFolder = ensureTraceFolderExists();
    const judgeResponseFile = path.join(traceFolder, 'judgeResponse.txt');
    fs.writeFileSync(judgeResponseFile, judgeResponse.critique);
    console.log('zzz object', judgeResponse);
    expect(judgeResponse.result).toEqual('passed');
  });
});
