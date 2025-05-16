import { BoolMeasure, Metric } from './types';
import { EvalPassResult, evalPassResultSchema, JudgeEvalModel, simpleJudgeMetric } from './util';

export function finalAnswerMetric(expectedResult?: string, model?: JudgeEvalModel): Metric {
  return simpleJudgeMetric<EvalPassResult, BoolMeasure>({
    model,
    config: {
      name: 'finalAnswer',
      schema: evalPassResultSchema,
      prompt: ({ input, output, expectedOutput }) => {
        const expected = expectedOutput ?? expectedResult;

        return `
        The following question was answered by an expert in PostgreSQL and database administration:
        <question>${input}</question>
        <expertAnswer>${output}</expertAnswer>
        ${expected ? `<expectedAnswer>${expected}</expectedAnswer>` : ''} 
        Please determine whether expert passed or failed at answering the question correctly and accurately. Please provied a critique of how the answer could be improved or does not match the response of an expert in PostgreSQl and database administration.
      `;
      },
      result: (result) => ({
        type: 'bool',
        success: result.result === 'passed',
        reason: result.critique
      })
    }
  });
}
