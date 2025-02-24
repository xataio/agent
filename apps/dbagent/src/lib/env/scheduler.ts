/* eslint-disable no-process-env */

import { z } from 'zod';

const schema = z.object({
  // How many schedules can run in parallel
  MAX_PARALLEL_RUNS: z.number().default(20),

  // How long to wait for a schedule to finish before assuming it's dead and running it again
  TIMEOUT_FOR_RUNNING_SCHEDULE_SECS: z.number().default(15 * 60)
});

export const env = schema.parse({
  TIMEOUT_FOR_RUNNING_SCHEDULE_SECS: process.env.TIMEOUT_FOR_RUNNING_SCHEDULE_SECS,
  MAX_PARALLEL_RUNS: process.env.MAX_PARALLEL_RUNS
});
