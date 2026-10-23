import { fileURLToPath } from 'node:url';

// Workspace lint-staged configs re-export this file and run commands from
// their own directory; prettier reads .prettierignore only from the cwd,
// so the root ignore file must be passed explicitly.
const prettierIgnore = fileURLToPath(new URL('.prettierignore', import.meta.url));

// The example is copied out with degit, so it cannot carry a lint-staged config that runs tools it never installs.
// Its files get their own block below and are kept out of the generic globs (root tsc, stylelint).
const temporalExample = fileURLToPath(new URL('examples/workflow-builder-temporal/', import.meta.url));
const isTemporalExample = (file) => /[/\\]examples[/\\]workflow-builder-temporal[/\\]/.test(file);
const outsideTemporalExample = (task) => (files) => {
  const rest = files.filter((file) => !isTemporalExample(file));
  return rest.length > 0 ? task(rest) : [];
};

/**
 * @type {import('lint-staged').Configuration}
 */
export default {
  '*.{ts,tsx,js,json,css,astro,md,mdx}': outsideTemporalExample(
    (files) => `prettier --write --ignore-path "${prettierIgnore}" --log-level=silent ${files.join(' ')}`,
  ),
  '*.{ts,tsx}': outsideTemporalExample((files) => [`eslint --max-warnings=0 --fix ${files.join(' ')}`, 'tsc --noEmit']),
  '*.css': outsideTemporalExample((files) => `stylelint ${files.join(' ')}`),
  // Outside the pnpm workspace, so nothing else formats or lints these. No tsc: they are plain Node.
  'tools/**/*.mjs': [
    (files) => `prettier --write --ignore-path "${prettierIgnore}" --log-level=silent ${files.join(' ')}`,
    (files) => `eslint --max-warnings=0 --fix ${files.join(' ')}`,
  ],
  'examples/workflow-builder-temporal/**/*.{ts,tsx,js,json,css,md}': (files) =>
    `prettier --write --ignore-path "${prettierIgnore}" --log-level=silent ${files.join(' ')}`,
  'examples/workflow-builder-temporal/**/*.{ts,tsx}': [
    (files) => `eslint --max-warnings=0 --fix ${files.join(' ')}`,
    () => `tsc --noEmit -p "${temporalExample}worker/tsconfig.json"`,
    () => `tsc --noEmit -p "${temporalExample}editor/tsconfig.json"`,
  ],
  'deploy/ai-studio/Dockerfile': () => 'node tools/check-offline-build.mjs',
};
