/* eslint-disable no-process-env */
import { z } from 'zod';
import { env as clientEnv } from './client';
import { env as serverEnv } from './server';

export const evalEnvSchema = z.object({
  JUDGE_MODEL: z.string().default('anthropic:claude-3-5-haiku'),
  CHAT_MODEL: z.string().default('anthropic:claude-3-5-haiku')
});

const evalEnv = evalEnvSchema.parse(process.env);

export const env = { ...clientEnv, ...serverEnv, ...evalEnv };
