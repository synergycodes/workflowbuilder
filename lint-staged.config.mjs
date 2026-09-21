import { fileURLToPath } from 'node:url';

// Workspace configs run from their workspace directory, so pin Prettier to the root ignore file.
const prettierIgnore = fileURLToPath(new URL('.prettierignore', import.meta.url));

/**
 * @type {import('lint-staged').Configuration}
 */
export default {
  '*.{ts,tsx,js,json,css,astro,md,mdx}': (files) =>
    `prettier --write --ignore-path "${prettierIgnore}" --log-level=silent ${files.join(' ')}`,
  '*.{ts,tsx}': [(files) => `eslint --max-warnings=0 --fix ${files.join(' ')}`, () => `tsc --noEmit`],
  // Outside the pnpm workspace, so nothing else formats or lints these. No tsc: they are plain Node.
  'tools/**/*.mjs': [
    (files) => `prettier --write --ignore-path "${prettierIgnore}" --log-level=silent ${files.join(' ')}`,
    (files) => `eslint --max-warnings=0 --fix ${files.join(' ')}`,
  ],
};
