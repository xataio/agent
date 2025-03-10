import { z } from 'zod';

export const evalResultSchema = z.object({ id: z.string(), result: z.enum(['passed', 'failed']) }).strict();
export type EvalResult = z.infer<typeof evalResultSchema>;

export const evalSummarySchema = z
  .object({
    id: z.string(),
    result: z.enum(['passed', 'failed']),
    logFiles: z.array(z.string())
  })
  .strict();
export type EvalSummary = z.infer<typeof evalSummarySchema>;
