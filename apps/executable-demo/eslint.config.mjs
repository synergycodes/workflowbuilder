import pluginReact from 'eslint-plugin-react';
import pluginHooks from 'eslint-plugin-react-hooks';

import baseEslintConfig from '../../eslint.config.mjs';

const rules = {
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
  'react/display-name': 'off',
  'react/prop-types': 'off',
  'react/function-component-definition': ['error', { namedComponents: 'function-declaration' }],
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: ['**/apps/ai-studio/**', 'apps/ai-studio/**', '@workflow-builder/ai-studio*'],
          message: 'Executable demo must remain independent from apps/ai-studio.',
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
    plugins: { 'react-hooks': pluginHooks },
    rules: { ...pluginHooks.configs.recommended.rules, ...rules },
    settings: { react: { version: 'detect' } },
  },
];
