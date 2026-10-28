import pluginAstro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

import baseConfig from '../../eslint.config.mjs';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  ...pluginAstro.configs.recommended,
  // eslint-plugin-astro detects the TS parser from cwd, where pnpm does not hoist it, so detection
  // depends on the NODE_PATH a bin shim sets. Pin what it would pick so every runner lints alike.
  {
    files: ['**/*.astro'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
    processor: 'astro/client-side-ts',
  },
  { ignores: ['dist/', '.astro/'] },
  { files: ['astro.config.mjs'], languageOptions: { globals: { process: 'readonly' } } },
];
