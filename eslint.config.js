import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default [
  {
    ignores: ['build/**', 'build-host/**', '.svelte-kit/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: { parserOptions: { parser: ts.parser } },
  },
  {
    files: ['src/**/*.svelte', 'src/**/*.ts', 'src/**/*.js', 'shared/**/*.ts'],
    ignores: ['src/**/*.server.*', 'src/**/server/**', 'src/**/+server.*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/server/**',
                '**/*.server.*',
                'node:*',
                'socket.io',
                '@dimforge/rapier3d-compat',
              ],
              message:
                'Keep host code in server/. Browser code may import shared definitions and socket.io-client.',
            },
          ],
        },
      ],
    },
  },
];
