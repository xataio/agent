import dotenvx from '@dotenvx/dotenvx';
import path from 'path';
import { defineConfig } from 'vitest/config';

const env = dotenvx.config({ path: '.env.eval' }).parsed;

export default defineConfig({
  test: {
    include: ['**/*.eval.ts'],
    exclude: ['**/node_modules/**'],
    watch: false,
    maxConcurrency: 2,
    env: { EVAL: 'true', ...env },
    testTimeout: 60000,
    hookTimeout: 60000,
    globalSetup: './src/evals/global-setup.ts',
    alias: {
      '~/': new URL('./src/', import.meta.url).pathname,
      'server-only': path.resolve(__dirname, './src/evals/mocks/empty.ts')
    },
    // https://github.com/nextauthjs/next-auth/discussions/9385#discussioncomment-11064988
    server: {
      deps: {
        inline: ['next']
      }
    },
    reporters: ['default', './src/evals/eval-reporter']
  }
});
