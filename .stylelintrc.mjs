// The csstools rule import()s an importFrom path as given, which Windows rejects
// (C:\ reads as a URL scheme); an object source never reaches that code path.
import customProperties from './tools/stylelint/custom-properties.mjs';

/** @type {import('stylelint').Config} */
export default {
  plugins: ['stylelint-value-no-unknown-custom-properties', './tools/stylelint/no-system-token-fallbacks.mjs'],
  ignoreFiles: ['**/node_modules/**', '**/dist/**', 'apps/docs/**'],
  rules: {
    'csstools/value-no-unknown-custom-properties': [true, { importFrom: [customProperties] }],
    'wb/no-system-token-fallbacks': true,
  },
};
