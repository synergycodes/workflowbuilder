/**
 * @type {import('lint-staged').Configuration}
 */
export default {
  '*.{ts,tsx,js,json,css}': (files) => `prettier --write --log-level=silent ${files.join(' ')}`,
  '*.{ts,tsx}': [(files) => `eslint --max-warnings=0 --fix ${files.join(' ')}`, () => `tsc --noEmit`],
};
