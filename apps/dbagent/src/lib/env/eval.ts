/* eslint-disable no-process-env */
import { z } from 'zod';
import { Model } from '../db/schema';
import { env as clientEnv } from './client';
import { env as serverEnv } from './server';

export const evalEnvSchema = z.object({
  JUDGE_MODEL: z.string().default('claude-3-5-haiku' satisfies Model),
  CHAT_MODEL: z.string().default('claude-3-5-haiku' satisfies Model)
});

const evalEnv = evalEnvSchema.parse(process.env);

export const env = { ...clientEnv, ...serverEnv, ...evalEnv };
