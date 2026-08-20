/**
 * DS 2.0 migration meter: counts remaining `var(--ax-*)` usages in workspace
 * sources. The old-system prefix disappears as components migrate to the
 * `--wb-*` token export, so this number only goes down; zero means done.
 */
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');

let count = 0;
for (const file of globSync(['packages/*/src/**/*.{css,ts,tsx}', 'apps/*/src/**/*.{css,ts,tsx}'], {
  cwd: REPO_ROOT,
})) {
  count += readFileSync(path.join(REPO_ROOT, file), 'utf8').match(/var\(--ax-/g)?.length ?? 0;
}

console.log(`DS 2.0 migration meter: ${count} var(--ax-*) usages remaining`);
