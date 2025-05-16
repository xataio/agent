import { describe } from 'vitest';
import { evalChat, turnFromResponse } from '~/evals/lib/chat-runner';
import { TableStat } from '~/lib/targetdb/db';
import { evalTurn } from '../lib/llmcheck';
import { regexResponseMetric } from '../lib/llmcheck/metrics';
import { EvalCase, runEvals } from '../lib/vitest-helpers';

type Test = EvalCase & {
  prompt: string;
  finalAnswerRegex: RegExp;
};

const toolCalls = {
  findTableSchema: async (_table: string) => {
    return 'public';
  },

  getTablesInfo: async () => {
    const data: TableStat[] = [
      {
        name: 'dogs',
        schema: 'public',
        rows: 100,
        size: '24 kB',
        seqScans: 100,
        idxScans: 100,
        nTupIns: 100,
        nTupUpd: 100,
        nTupDel: 100
      }
    ];
    return data;
  }
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
    const result = await evalChat({ prompt, expect, toolCalls });
    const turn = turnFromResponse(prompt, result);
    const metric = regexResponseMetric(finalAnswerRegex);
    const measure = await evalTurn(turn, metric);

    expect(measure.success).toBe(true);
  });
});
