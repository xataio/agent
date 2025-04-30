/* eslint-disable no-process-env */
import { z } from 'zod';

const schema = z.object({
  PUBLIC_URL: z.string().default('http://localhost:4001')
});

export const env = schema.parse({
  PUBLIC_URL: process.env.PUBLIC_URL
});
