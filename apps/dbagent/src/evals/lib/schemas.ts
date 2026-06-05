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

export const evalToolPolicySchema = z
  .object({
    expectedToolCalls: z.array(z.string()).default([]),
    allowOtherTools: z.boolean().default(true)
  })
  .strict();
export type EvalToolPolicy = z.infer<typeof evalToolPolicySchema>;

export const evalTraceMetadataSchema = z
  .object({
    scenario: z.string().optional(),
    toolPolicy: evalToolPolicySchema.optional()
  })
  .strict();
export type EvalTraceMetadata = z.infer<typeof evalTraceMetadataSchema>;

export const evalToolCallSchema = z
  .object({
    step: z.number().int().positive(),
    toolCallId: z.string().optional(),
    toolName: z.string(),
    args: z.unknown().optional(),
    hasResult: z.boolean(),
    resultPreview: z.string().optional(),
    error: z.string().optional()
  })
  .strict();
export type EvalToolCall = z.infer<typeof evalToolCallSchema>;

export const evalFailureClassificationSchema = z.enum([
  'malformed-request',
  'missing-system-prompt',
  'missing-user-prompt',
  'missing-expected-tool',
  'unexpected-tool-call',
  'tool-error',
  'no-tool-result',
  'empty-final-answer'
]);
export type EvalFailureClassification = z.infer<typeof evalFailureClassificationSchema>;

export const evalReplayManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string(),
    metadata: evalTraceMetadataSchema,
    provider: z
      .object({
        model: z.string().optional(),
        requestBodyCaptured: z.boolean()
      })
      .strict(),
    prompts: z
      .object({
        system: z.string().optional(),
        user: z.string().optional()
      })
      .strict(),
    steps: z.array(
      z
        .object({
          index: z.number().int().positive(),
          text: z.string(),
          toolCalls: z.array(evalToolCallSchema)
        })
        .strict()
    ),
    finalAnswer: z.string(),
    diagnostics: z
      .object({
        classifications: z.array(evalFailureClassificationSchema),
        expectedToolCalls: z.array(z.string()),
        observedToolCalls: z.array(z.string()),
        missingExpectedToolCalls: z.array(z.string()),
        unexpectedToolCalls: z.array(z.string()),
        toolErrors: z.array(evalToolCallSchema)
      })
      .strict()
  })
  .strict();
export type EvalReplayManifest = z.infer<typeof evalReplayManifestSchema>;
