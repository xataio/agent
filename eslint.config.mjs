import { includeIgnoreFile } from '@eslint/compat';
import { nextjs } from '@xata.io/eslint-config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  includeIgnoreFile(path.resolve(__dirname, '.gitignore')),
  {
    ignores: ['next.config.js', 'react-table-config.d.ts', 'eslint.config.mjs', 'postcss.config.js']
  },
  ...nextjs,
  {
    rules: {
      'no-process-env': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'configcat-react',
              importNames: ['useFeatureFlag'],
              message: `Please use: import { useFeatureFlag } from '~/hooks/useFeatureFlag';`
            }
          ]
        }
      ],
      'react-hooks/exhaustive-deps': 'off'
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname
      }
    }
  }
];
