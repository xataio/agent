import { fixupPluginRules } from '@eslint/compat';
import eslint from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import checkFilePlugin from 'eslint-plugin-check-file';
import importPlugin from 'eslint-plugin-import';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * @example hello, hello-world
 */
const KEBAB_CASE = '+([a-z])*([a-z0-9])*(-+([a-z0-9]))';

export const base = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    plugins: {
      'check-file': checkFilePlugin,
      import: importPlugin
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        sourceType: 'module'
      }
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'import/no-default-export': 'error',
      'import/no-anonymous-default-export': 'off',
      'no-unused-expressions': ['error', { enforceForJSX: true }],
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-useless-escape': 'warn',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: false
        }
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true, caughtErrors: 'none' }
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'mixpanel-browser',
              importNames: ['default'],
              message: "Please `import { mixpanel } from '~/utils/mixpanel'` instead"
            },
            {
              name: 'lodash',
              importNames: ['default'],
              message:
                "Please import only the functions you need to reduce bundle size. E.g. import { range } from 'lodash'"
            },
            {
              name: '@internal/markdown/componentsForMdx',
              importNames: ['componentsForMdx', 'componentsForMd'],
              message: "Please `import { componentsForMdx, componentsForMd } from '~/utils/componentsForMdx'` instead"
            }
          ]
        }
      ],
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/*.test.{js,ts,jsx,tsx}': `@(${KEBAB_CASE}).test`,
          '**/*.d.{js,ts}': `@(${KEBAB_CASE}).d`,
          '**/!(*.test).{jsx,tsx}': 'KEBAB_CASE',
          '**/!(*.test|*.config|*.d).{js,ts}': 'KEBAB_CASE'
        }
      ],
      'check-file/folder-naming-convention': [
        'error',
        {
          '**/': 'NEXT_JS_APP_ROUTER_CASE'
        }
      ]
    }
  },
  {
    files: ['*.test.ts{,x}'],
    rules: {
      'no-restricted-imports': 'off' // this are purely for bundle size
    }
  },
  {
    files: ['{src/,}pages/**/*.ts{,x}', '{src/,}app/**/*.ts{,x}'],
    rules: {
      'import/no-default-export': 'off' // next.js pages/ and app/ folder uses default export
    }
  },
  {
    files: ['*.config.{,m}{j,t}s'],
    rules: {
      'import/no-default-export': 'off' // config files uses default export
    }
  }
);
export default base;

export const nextjs = tseslint.config(...base, jsxA11yPlugin.flatConfigs.recommended, {
  plugins: {
    react: reactPlugin,
    'react-hooks': fixupPluginRules(reactHooksPlugin),
    '@next/next': fixupPluginRules(nextPlugin)
  },
  rules: {
    ...reactPlugin.configs.recommended.rules,
    ...reactPlugin.configs['jsx-runtime'].rules,
    ...reactHooksPlugin.configs.recommended.rules,
    ...nextPlugin.configs.recommended.rules,
    ...nextPlugin.configs['core-web-vitals'].rules,
    'react/jsx-curly-brace-presence': ['warn', { props: 'never', propElementValues: 'always' }],
    'react/prop-types': 'off',
    'jsx-a11y/no-autofocus': 'off'
  },
  languageOptions: {
    parserOptions: {
      ecmaFeatures: {
        jsx: true
      }
    }
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
});
