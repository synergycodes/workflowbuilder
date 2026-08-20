/**
 * importFrom source for `csstools/value-no-unknown-custom-properties`.
 *
 * Collects every custom-property definition the repo actually ships — the
 * built token dist plus all workspace source CSS — so the rule validates
 * `var(--…)` usages against names that exist somewhere, without a hand-kept
 * file list going stale.
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
