// Asserts that every `@category Foo` tag in packages/sdk/src has a matching
// `autogenerate: { directory: 'api/Foo' }` entry in apps/docs/astro.config.mjs.
//
// Without this guard, a contributor can introduce a new @category in source
// TSDoc and the docs build will succeed: the pages exist on disk under
// api/<NewCategory>/ but the sidebar never references them, so a reader can
// only reach those symbols via cross-link or search. Strict-mode TypeDoc
// won't catch this — it only verifies that a comment exists, not that the
// sidebar agrees with the categorization.
//
// Failure is exit 1 with the missing categories listed and a copy-pasteable
// sidebar entry. Stale sidebar entries (no matching @category in source) are
// reported as warnings only — they can stay during a category rename until
// the old pages drain out of caches.
//
// Wired into apps/docs/package.json's `build` script before `astro build`,
// so `pnpm build:docs` (and the CI build_docs step) catches the drift at
// the same gate as the strict-mode TypeDoc check.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const documentsRoot = path.resolve(here, '..');
const sdkSourceRoot = path.resolve(documentsRoot, '../../packages/sdk/src');
const astroConfigPath = path.resolve(documentsRoot, 'astro.config.mjs');

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(entryPath);
    else if (/\.(ts|tsx|mts)$/.test(entry.name)) yield entryPath;
  }
}

const sourceCategories = new Set();
const categoryRe = /@category\s+(\S+)/g;
for (const file of walk(sdkSourceRoot)) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(categoryRe)) sourceCategories.add(match[1]);
}

const sidebarCategories = new Set();
const sidebarRe = /autogenerate:\s*\{\s*directory:\s*['"]api\/([^'"\s/]+)['"]/g;
const config = readFileSync(astroConfigPath, 'utf8');
for (const match of config.matchAll(sidebarRe)) sidebarCategories.add(match[1]);

const missing = [...sourceCategories].filter((c) => !sidebarCategories.has(c));
const stale = [...sidebarCategories].filter((c) => !sourceCategories.has(c));

if (missing.length > 0) {
  console.error('error: @category tags in packages/sdk/src have no matching sidebar entry.\n');
  for (const category of missing) {
    console.error(`  - api/${category}`);
  }
  console.error('\nAdd a matching entry under "API Reference" in apps/docs/astro.config.mjs:');
  for (const category of missing) {
    console.error(`  { label: '${category}', collapsed: true, autogenerate: { directory: 'api/${category}' } },`);
  }
  // Build-gate script: console.error above already prints the formatted
  // punch list, so process.exit gives a clean non-zero without a stack trace.
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1);
}

if (stale.length > 0) {
  console.warn('warning: sidebar entries with no matching @category in source (stale):');
  for (const category of stale) {
    console.warn(`  - api/${category}`);
  }
  console.warn('Either drop them from astro.config.mjs or expect them to render an empty group.');
}

console.log(`✓ sidebar / @category parity ok — ${sourceCategories.size} categories cross-checked.`);
