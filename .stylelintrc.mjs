import { fileURLToPath } from 'node:url';

// The csstools rule resolves importFrom paths against process.cwd(), and
// lint-staged runs commands from workspace directories — anchor to this file.
const customProperties = fileURLToPath(new URL('./tools/stylelint/custom-properties.mjs', import.meta.url));

/** @type {import('stylelint').Config} */
export default {
  plugins: ['stylelint-value-no-unknown-custom-properties', './tools/stylelint/no-system-token-fallbacks.mjs'],
  ignoreFiles: ['**/node_modules/**', '**/dist/**', 'apps/docs/**'],
  rules: {
    'csstools/value-no-unknown-custom-properties': [true, { importFrom: [customProperties] }],
    'wb/no-system-token-fallbacks': true,
  },
};
