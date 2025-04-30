import { z } from 'zod';
import { evalEnvSchema } from '../../lib/env/eval';

export const evalResultSchema = z
  .object({ id: z.string(), result: z.enum(['passed', 'failed']), env: evalEnvSchema })
  .strict();
export type EvalResult = z.infer<typeof evalResultSchema>;

export const evalResultEnum = z.enum(['passed', 'failed']);

export const evalSummarySchema = z
  .object({
    id: z.string(),
    result: evalResultEnum,
    logFiles: z.array(z.string()),
    env: evalEnvSchema
  })
  .strict();
export type EvalSummary = z.infer<typeof evalSummarySchema>;
