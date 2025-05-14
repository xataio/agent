import fs from 'fs';
import path from 'path';
import { afterAll, beforeAll, describe } from 'vitest';
import { AgentModelDeps, chatModel, getAgentMockDeps, getModelInstance } from '~/lib/ai/agent';
import { Tool } from '~/lib/ai/model';
import { env } from '~/lib/env/eval';
import { TableStat } from '~/lib/targetdb/db';
import { turnFromResponse } from '../lib/chat-runner';
import { evalTurn, LLMTurn, setEvalModel } from '../lib/llmcheck';
import { conciseAnswerMetric, Metric } from '../lib/llmcheck/metrics';
import { finalAnswerMetric } from '../lib/llmcheck/metrics/final-answer';
import { ensureTraceFolderExistsExpect } from '../lib/test-id';
import { EvalCase, runEvals } from '../lib/vitest-helpers';

beforeAll(async () => {
  const model = await getModelInstance(env.JUDGE_MODEL);
  setEvalModel(model);
});

afterAll(async () => {
  setEvalModel(undefined);
});

type LLMJudgeEval = EvalCase & { turn: LLMTurn; judge: Metric };

const conciseAnswer = conciseAnswerMetric();

// Mock the agent backend services. The getAgentMockDeps creates
// mocks that will raise an error when the tools are called.
// Set some default tool response for the eval via toolMocks. `toolMocks` gets
// the mocked tools as used by the agent and modifies the responsess for a
// selected set of tools.
const deps = getAgentMockDeps({});
const toolMocks = (tools: Record<string, Tool<AgentModelDeps>>) => {
  tools.getTablesInfo!.execute = async () => {
    const data: TableStat[] = [
      {
        name: 'dogs',
        schema: 'public',
        rows: 100,
        size: '100',
        seqScans: 100,
        idxScans: 100,
        nTupIns: 100,
        nTupUpd: 100,
        nTupDel: 100
      }
    ];
    return data;
  };
  return tools;
};

describe.concurrent('judge', async () => {
  const evalCases: LLMJudgeEval[] = (
    await Promise.all(
      [
        {
          id: 'tables_in_db',
          prompt: 'What tables do I have in my db?',
          judges: [finalAnswerMetric('dogs'), conciseAnswer]
        },
        {
          id: 'tables_in_db_how_many',
          prompt: 'How many tables do I have in my db?',
          judges: [finalAnswerMetric('1'), conciseAnswer]
        }
      ].map(async (evalCase) => {
        const result = await chatModel.generateText({
          prompt: evalCase.prompt,
          deps,
          maxSteps: 20,
          tools: toolMocks
        });

        return evalCase.judges.map((judge) => ({
          id: `${judge.name()}_${evalCase.id}`,
          turn: turnFromResponse(evalCase.prompt, result),
          judge
        })) as LLMJudgeEval[];
      })
    )
  ).flat();

  runEvals(evalCases, async ({ turn, judge }, { expect }) => {
    const traceFolder = ensureTraceFolderExistsExpect(expect);

    const measure = await evalTurn(turn, judge);

    const evalFile = path.join(traceFolder, 'eval.txt');
    fs.writeFileSync(evalFile, measure.reason ?? '');
    expect(measure.success).toBe(true);
  });
});
