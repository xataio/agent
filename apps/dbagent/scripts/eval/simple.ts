'use server';

import Langfuse from 'langfuse';
import { evalAllTurn, LLMTurn } from '~/evals/lib/llmcheck';
import { conciseAnswerMetric, finalAnswerMetric, Measure } from '~/evals/lib/llmcheck/metrics';

const metrics = [conciseAnswerMetric(), finalAnswerMetric()];

export async function evalFunction(langfuse: Langfuse, turn: LLMTurn): Promise<Record<string, Measure>> {
  console.log(turn);

  const evals = await evalAllTurn(turn, metrics);
  return evals;
}
