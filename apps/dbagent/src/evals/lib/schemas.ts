import { z } from 'zod';

export const testCaseResultSchema = z.object({ id: z.string(), result: z.enum(['passed', 'failed']) }).strict();
export type TestCaseResult = z.infer<typeof testCaseResultSchema>;

export const testCaseSummarySchema = z
  .object({
    id: z.string(),
    result: z.enum(['passed', 'failed']),
    logFiles: z.array(z.string())
  })
  .strict();
export type TestCaseSummary = z.infer<typeof testCaseSummarySchema>;
