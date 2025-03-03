import dotenvx from '@dotenvx/dotenvx';
import { defineConfig } from 'vitest/config';

const env = dotenvx.config({ path: '.env.eval' }).parsed;

export default defineConfig({
  test: {
    include: ['**/*.eval.ts'],
    exclude: ['**/node_modules/**'],
    watch: false,
    maxConcurrency: 1,
    env: { EVAL: '1', ...env }
  }
});
