/* eslint-disable no-process-env */
import { z } from 'zod';
import { env as clientEnv } from './client';
import { env as serverEnv } from './server';

const schema = z.object({
  JUDGE_MODEL: z.string().default('anthropic-claude-3-5-haiku-20241022'),
  CHAT_MODEL: z.string().default('anthropic-claude-3-5-haiku-20241022')
});

const evalEnv = schema.parse(process.env);

export const env = { ...clientEnv, ...serverEnv, ...evalEnv };
