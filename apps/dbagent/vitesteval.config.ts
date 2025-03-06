import dotenvx from '@dotenvx/dotenvx';
import { defineConfig } from 'vitest/config';
import { evalReporter } from './src/evals/evalReporter';

const env = dotenvx.config({ path: '.env.eval' }).parsed;

export default defineConfig({
  test: {
    include: ['**/*.eval.ts'],
    exclude: ['**/node_modules/**'],
    watch: false,
    maxConcurrency: 1,
    env: { EVAL: '1', ...env },
    testTimeout: 30000,
    globalSetup: './src/evals/globalSetup.ts',
    setupFiles: './src/evals/setup.ts',
    alias: {
      '~/': new URL('./src/', import.meta.url).pathname
    },
    // https://github.com/nextauthjs/next-auth/discussions/9385#discussioncomment-11064988
    server: {
      deps: {
        inline: ['next']
      }
    },
    reporters: ['default', evalReporter]
  }
});
