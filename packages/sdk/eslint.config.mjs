import baseEslintConfig from '../../eslint.config.mjs';
import pluginReact from 'eslint-plugin-react';
import pluginHooks from 'eslint-plugin-react-hooks';
import pluginTsdoc from 'eslint-plugin-tsdoc';

const rules = {
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'separate-type-imports' }],
  'react/display-name': 'off',
  'react/prop-types': 'off',
  'react/function-component-definition': [
    'error',
    {
      namedComponents: 'function-declaration',
    },
  ],
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: ['src/*'],
          message: 'Use the "@/" alias for cross-tree imports or relative paths for siblings. "src/*" is not a valid import path.',
        },
      ],
    },
  ],
};

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseEslintConfig,
  { files: ['**/*.{ts,tsx}'] },
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  {
    plugins: {
      'react-hooks': pluginHooks,
    },
    rules: {
      ...pluginHooks.configs.recommended.rules,
      ...rules,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // tsdoc/syntax — scoped to library source only. Tests, validation
  // helpers (which embed `@cfworker/json-schema` package names in
  // comments and trip the "looks-like-a-tag" rule), and config files
  // (which use `@type {…}` JSDoc, not TSDoc) are intentionally excluded.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.spec.{ts,tsx}', 'src/utils/validation/**'],
    plugins: { tsdoc: pluginTsdoc },
    rules: { 'tsdoc/syntax': 'warn' },
  },
];
