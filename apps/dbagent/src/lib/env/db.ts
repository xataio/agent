/* eslint-disable no-process-env */

import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string()
});

// Public environment variables need to be manually parsed from `process.env`
export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL
});
