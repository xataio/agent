/* eslint-disable no-process-env */
import 'server-only';
import { z } from 'zod';
import { env as clientEnv } from './client';

const schema = z.object({
  // The URL of the database that we use to store data
  DATABASE_URL: z.string(),

  // The OpenID client settings
  AUTH_SECRET: z.string().optional(),
  AUTH_OPENID_ID: z.string().optional(),
  AUTH_OPENID_SECRET: z.string().optional(),
  AUTH_OPENID_ISSUER: z.string().optional(),

  // LLM API credentials
  OPENAI_API_KEY: z.string(),
  DEEPSEEK_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Scheduler
  MAX_PARALLEL_RUNS: z.number().default(20), // How many schedules can be run in parallel
  TIMEOUT_FOR_RUNNING_SCHEDULE_SECS: z.number().default(15 * 60) // How long to wait before assuming it's dead and restart
});

const serverEnv = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,

  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_OPENID_ID: process.env.AUTH_OPENID_ID,
  AUTH_OPENID_SECRET: process.env.AUTH_OPENID_SECRET,
  AUTH_OPENID_ISSUER: process.env.AUTH_OPENID_ISSUER,

  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,

  MAX_PARALLEL_RUNS: process.env.MAX_PARALLEL_RUNS,
  TIMEOUT_FOR_RUNNING_SCHEDULE_SECS: process.env.TIMEOUT_FOR_RUNNING_SCHEDULE_SECS
});

export const env = { ...clientEnv, ...serverEnv };
