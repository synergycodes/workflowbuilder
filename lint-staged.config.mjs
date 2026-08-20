import { fileURLToPath } from 'node:url';

// Workspace lint-staged configs re-export this file and run commands from
// their own directory; prettier reads .prettierignore only from the cwd,
// so the root ignore file must be passed explicitly.
const prettierIgnore = fileURLToPath(new URL('./.prettierignore', import.meta.url));

/**
 * @type {import('lint-staged').Configuration}
 */
export default {
  '*.{ts,tsx,js,json,css,astro,md,mdx}': (files) =>
    `prettier --write --log-level=silent --ignore-path ${prettierIgnore} ${files.join(' ')}`,
  '*.{ts,tsx}': [(files) => `eslint --max-warnings=0 --fix ${files.join(' ')}`, () => `tsc --noEmit`],
  '*.css': (files) => `stylelint ${files.join(' ')}`,
};
