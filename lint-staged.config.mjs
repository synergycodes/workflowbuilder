import { fileURLToPath } from 'node:url';

// Every workspace's lint-staged.config.mjs re-exports this one, and lint-staged runs
// each of them with that workspace as the working directory. Prettier looks for
// .prettierignore relative to the working directory, so from packages/foo it finds
// nothing and formats files the root .prettierignore says to leave alone. Resolving the
// path off this module's own location pins it to the root file from every workspace.
const prettierIgnore = fileURLToPath(new URL('.prettierignore', import.meta.url));

/**
 * @type {import('lint-staged').Configuration}
 */
export default {
  '*.{ts,tsx,js,json,css,astro,md,mdx}': (files) =>
    `prettier --write --ignore-path ${prettierIgnore} --log-level=silent ${files.join(' ')}`,
  '*.{ts,tsx}': [(files) => `eslint --max-warnings=0 --fix ${files.join(' ')}`, () => `tsc --noEmit`],
};
