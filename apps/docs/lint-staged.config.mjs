import { fileURLToPath } from 'node:url';

const prettierIgnore = fileURLToPath(new URL('../../.prettierignore', import.meta.url));

export default {
  '*.{ts,tsx,js,json,css,astro,md,mdx}': (files) =>
    `prettier --write --ignore-path "${prettierIgnore}" --log-level=silent ${files.join(' ')}`,
  '*.{ts,tsx}': (files) => `eslint --max-warnings=0 --fix ${files.join(' ')}`,
  '*.css': (files) => `stylelint ${files.join(' ')}`,
};
