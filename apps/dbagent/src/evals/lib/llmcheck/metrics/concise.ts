import { BoolMeasure, Metric } from './types';
import { EvalPassResult, JudgeEvalModel, evalPassResultSchema, simpleJudgeMetric } from './util';

export function conciseAnswerMetric(model?: JudgeEvalModel): Metric {
  return simpleJudgeMetric<EvalPassResult, BoolMeasure>({
    model,
    config: {
      name: 'concise',
      schema: evalPassResultSchema,
      prompt: ({ input, output }) => `
        The following question was answered by an expert in PostgreSQL and database administration:
        <question>${input}</question>
        <answer>${output}</answer>

        Please determine whether expert passed or failed at answering the question
        concisely with no extra information offered unless it's explicitly asked for
        in the question or it's almost certain from the question the user would
        want it. Please provide a critique of how the answer could be improved or
        does not match the response of an expert in PostgreSQL and database
        administration.`,
      result: (result) => ({
        type: 'bool',
        success: result.result === 'passed',
        reason: result.critique
      })
    }
  });
}
