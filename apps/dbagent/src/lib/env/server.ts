/* eslint-disable no-process-env */
import 'server-only';
import { z } from 'zod';
import { env as clientEnv } from './client';

const schema = z.object({
  // The URL of the database that we use to store data
  DATABASE_URL: z.string(),

  // The OpenID client settings
  AUTH_SECRET: z.string(),
  AUTH_OPENID_ID: z.string(),
  AUTH_OPENID_SECRET: z.string(),
  AUTH_OPENID_ISSUER: z.string(),

  // LLM API credentials
  OPENAI_API_KEY: z.string(),
  DEEPSEEK_API_KEY: z.string(),
  ANTHROPIC_API_KEY: z.string(),

  // How many schedules can run in parallel
  MAX_PARALLEL_RUNS: z.number().default(20),

  // How long to wait for a schedule to finish before assuming it's dead and running it again
  TIMEOUT_FOR_RUNNING_SCHEDULE_SECS: z.number().default(15 * 60)
});

const serverEnv = schema.parse(process.env);

export const env = { ...clientEnv, ...serverEnv };
