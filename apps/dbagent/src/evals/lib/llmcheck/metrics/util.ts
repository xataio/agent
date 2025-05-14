import { generateObject, LanguageModel } from 'ai';

import { z } from 'zod';
import { getEvalModel } from '..';
import { Chat, LLMTurn } from '../types';
import { Measure, Metric } from './types';

export const evalPassResultSchema = z.object({
  result: z.enum(['passed', 'failed']),
  critique: z.string()
});

export type EvalPassResult = z.infer<typeof evalPassResultSchema>;

export const evalScoreResultSchema = z.object({
  score: z.number(),
  critique: z.string()
});

export type EvalScoreResult = z.infer<typeof evalScoreResultSchema>;

export type LLMJudgeConfig<T, R extends Measure> = {
  name: string;
  schema: z.ZodTypeAny;
  prompt: (args: { input: string; steps: string[]; output: string; expectedOutput?: string }) => string;
  result?: (result: T) => R;
};

export type JudgeEvalModel = LanguageModel | (() => Promise<LanguageModel>);

export function simpleJudgeMetric<T, R extends Measure>({
  model,
  config
}: {
  model?: JudgeEvalModel;
  config: LLMJudgeConfig<T, R>;
}): Metric {
  return {
    name: () => config.name,
    requiredParams: () => ['input', 'output'],
    measureTurn: (turn) => measureTurn({ model, config, turn }),
    measureChat: (chat) => measureChat({ model, config, chat })
  };
}

async function measureTurn<T, R extends Measure>({
  model,
  config,
  turn
}: {
  model?: JudgeEvalModel;
  config: LLMJudgeConfig<T, R>;
  turn: LLMTurn;
}): Promise<R> {
  return await measure({ model, config, input: turn.input, output: turn.output });
}

async function measureChat<T, R extends Measure>({
  model,
  config,
  chat
}: {
  model?: JudgeEvalModel;
  config: LLMJudgeConfig<T, R>;
  chat: Chat;
}): Promise<R> {
  if (chat.turns.length === 0) {
    throw new Error('Chat has no turns');
  }
  const initialTurn = chat.turns[0]!;
  const finalTurn = chat.turns[chat.turns.length - 1]!;
  return await measure({ model, config, input: initialTurn.input, output: finalTurn.output });
}

async function measure<T, R extends Measure>({
  model,
  config,
  input,
  output,
  expectedOutput
}: {
  model?: JudgeEvalModel;
  config: LLMJudgeConfig<T, R>;
  input: string;
  output: string;
  expectedOutput?: string;
}): Promise<R> {
  const prompt = config.prompt({ input, steps: [], output, expectedOutput });

  const evalModel = model ? (typeof model === 'function' ? await model() : model) : getEvalModel();
  const { object: judgeResponse } = await generateObject({
    model: evalModel,
    schema: config.schema,
    prompt
  });

  return config.result ? config.result(judgeResponse) : (judgeResponse as R);
}
