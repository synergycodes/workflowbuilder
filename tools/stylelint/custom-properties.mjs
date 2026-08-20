/**
 * Feeds stylelint the set of custom properties defined anywhere in the repo.
 *
 * The unknown-property rule checks names one file at a time, but our
 * definitions live outside the files that use them (the built token dist,
 * sibling variables.css files). This module is wired into the rule's
 * `importFrom` option in .stylelintrc.mjs, so "defined" means defined
 * anywhere in the workspace — collected by glob, not by a hand-kept list.
 *
 * Requires a built `packages/tokens/dist` (created by `pnpm install` via the
 * tokens package's `prepare` script, and by `pnpm build:ui`).
 */
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import postcss from 'postcss';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');

// Set at runtime from JS, so no stylesheet defines them.
const RUNTIME_DEFINED = {
  // Base UI positioner writes the anchor dimensions onto the popup element.
  '--anchor-width': '0px',
  '--anchor-height': '0px',
  // packages/ui node-as-port-wrapper.tsx inline style.
  '--ax-node-as-port-width': '0px',
  '--ax-node-as-port-height': '0px',
  '--ax-node-as-port-position': 'none',
  // apps/ai-studio log-panel.tsx inline style.
  '--log-panel-right': '0px',
};

const customProperties = { ...RUNTIME_DEFINED };

const files = globSync(['packages/tokens/dist/**/*.css', 'packages/*/src/**/*.css', 'apps/*/src/**/*.css'], {
  cwd: REPO_ROOT,
}).filter((file) => !file.startsWith(`apps${path.sep}docs${path.sep}`));

for (const file of files) {
  const absolute = path.join(REPO_ROOT, file);
  postcss.parse(readFileSync(absolute, 'utf8'), { from: absolute }).walkDecls(/^--/, (decl) => {
    customProperties[decl.prop] = decl.value;
  });
}

export default { customProperties };
