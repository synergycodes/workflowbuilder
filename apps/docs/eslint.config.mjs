import baseConfig from '../../eslint.config.mjs';
import pluginAstro from 'eslint-plugin-astro';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  ...pluginAstro.configs.recommended,
  { ignores: ['dist/', '.astro/'] },
  { files: ['astro.config.mjs'], languageOptions: { globals: { process: 'readonly' } } },
];
