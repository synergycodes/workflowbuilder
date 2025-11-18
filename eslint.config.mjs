import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginTypescript from 'typescript-eslint';
import pluginUnicorn from 'eslint-plugin-unicorn';
import eslintConfigPrettier from 'eslint-config-prettier';

/** @type {import('eslint').Linter.RulesRecord} */
const rules = {
  'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
  'unicorn/filename-case': ['error', { case: 'kebabCase' }],
  'unicorn/no-null': 'off', // Disabled for now, but worth considering - https://github.com/sindresorhus/meta/discussions/7
  'unicorn/no-array-callback-reference': 'off',
  'unicorn/no-array-reduce': 'off',
  'unicorn/no-nested-ternary': 'off',
  'unicorn/prevent-abbreviations': [
    'error',
    {
      allowList: {
        Props: true,
        props: true,
        Ref: true,
        ref: true,
        Env: true,
        env: true,
        Fn: true,
        fn: true,
        Params: true,
        params: true,
        utils: true,
        Utils: true,
      },
    },
  ],
};

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ['**/*.{ts}'] },
  { languageOptions: { globals: globals.browser } },
  { ignores: ['**/node_modules/', '.git/', '**/dist/'] },
  pluginJs.configs.recommended,
  eslintConfigPrettier,
  ...pluginTypescript.configs.recommended,
  pluginUnicorn.configs.recommended,
  {
    rules,
  },
];
