import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Workspace lint-staged configs re-export this file and run commands from
// their own directory, so the script path must stay anchored to the repo root.
const tokenUsageLint = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'packages/tokens/scripts/lint-token-usage.mjs',
);

/**
 * @type {import('lint-staged').Configuration}
 */
export default {
  '*.{ts,tsx,js,json,css,astro,md,mdx}': (files) => `prettier --write --log-level=silent ${files.join(' ')}`,
  '*.{ts,tsx}': [(files) => `eslint --max-warnings=0 --fix ${files.join(' ')}`, () => `tsc --noEmit`],
  '*.{css,scss,ts,tsx}': (files) => `node ${tokenUsageLint} --files ${files.join(' ')}`,
};
