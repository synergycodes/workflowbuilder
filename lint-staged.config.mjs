import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Workspace lint-staged configs re-export this file and run commands from
// their own directory; prettier reads .prettierignore only from the cwd,
// so the root ignore file must be passed explicitly.
const prettierIgnore = fileURLToPath(new URL('.prettierignore', import.meta.url));

// The Temporal example is two npm projects (editor/, worker/) outside the workspace: the root tsc and
// stylelint skip it, and each project type-checks against its own node_modules, if it is installed.
const temporalExample = fileURLToPath(new URL('examples/workflow-builder-temporal/', import.meta.url));
const outsideTemporalExample = (task) => (files) => {
  const rest = files.filter((file) => !/[/\\]examples[/\\]workflow-builder-temporal[/\\]/.test(file));
  return rest.length > 0 ? task(rest) : [];
};
const typecheckTemporal = (project) => () =>
  existsSync(`${temporalExample}${project}/node_modules`)
    ? `tsc --noEmit -p "${temporalExample}${project}/tsconfig.json"`
    : [];

/**
 * @type {import('lint-staged').Configuration}
 */
export default {
  '*.{ts,tsx,js,json,css,astro,md,mdx}': (files) =>
    `prettier --write --ignore-path "${prettierIgnore}" --log-level=silent ${files.join(' ')}`,
  '*.{ts,tsx}': [
    (files) => `eslint --max-warnings=0 --fix ${files.join(' ')}`,
    outsideTemporalExample(() => 'tsc --noEmit'),
  ],
  '*.css': outsideTemporalExample((files) => `stylelint ${files.join(' ')}`),
  // Outside the pnpm workspace, so nothing else formats or lints these. No tsc: they are plain Node.
  'tools/**/*.mjs': [
    (files) => `prettier --write --ignore-path "${prettierIgnore}" --log-level=silent ${files.join(' ')}`,
    (files) => `eslint --max-warnings=0 --fix ${files.join(' ')}`,
  ],
  'examples/workflow-builder-temporal/{worker,shared}/**/*.ts': typecheckTemporal('worker'),
  'examples/workflow-builder-temporal/{editor,shared}/**/*.{ts,tsx}': typecheckTemporal('editor'),
  'deploy/ai-studio/Dockerfile': () => 'node tools/check-offline-build.mjs',
};
