import baseEslintConfig from '../../eslint.config.mjs';
import pluginReact from 'eslint-plugin-react';
import pluginHooks from 'eslint-plugin-react-hooks';

const rules = {
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
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
          group: ['@/plugins/*'],
          message: 'Importing from plugins is restricted (plugin can be removed). Please use @/feature/plugins',
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
];
