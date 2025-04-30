import { z } from 'zod';

export const evalFileSchema = z.object({
  fileName: z.string(),
  contents: z.string()
});

export type EvalFile = z.infer<typeof evalFileSchema>;

export const evalResponseSchema = z.object({
  files: z.array(evalFileSchema)
});

export type EvalResponse = z.infer<typeof evalResponseSchema>;
