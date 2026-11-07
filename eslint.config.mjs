import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['design/**', 'node_modules/**', 'out/**', 'dist/**', 'release/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: [
      'src/main/**/*.ts',
      'src/preload/**/*.ts',
      'electron.vite.config.ts',
      'vitest.config.mts',
      'tests/**/*.ts',
    ],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/renderer/**/*.ts'],
    languageOptions: { globals: globals.browser },
  },
  {
    // Game logic must stay pure: no UI, Electron or Node imports.
    files: ['src/game/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['electron', 'electron/*'], message: 'src/game must not import Electron.' },
            {
              group: ['**/main/**', '**/preload/**', '**/renderer/**'],
              message: 'src/game must not import UI/process code.',
            },
            { group: ['node:*'], message: 'src/game must stay environment-agnostic.' },
          ],
        },
      ],
    },
  },
  prettier,
);
