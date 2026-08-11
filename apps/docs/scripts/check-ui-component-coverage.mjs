// Asserts that every entry in packages/ui/vite.config.mts's `componentEntries`
// (the list of publishable subpath bundles) has at least one matching entry
// in generate-ui-api.mjs's `COMPONENTS` (the list of docs pages with a
// generated Props / CSS variables table).
//
// Without this guard, a new component can be added to the package's public
// entry points and shipped to npm without ever getting a docs page - nothing
// else in the build fails, the page just silently never exists. TypeDoc's
// strict mode doesn't catch this either: it only checks that exported types
// have doc comments, not that a docs page renders them.
//
// A vite entry counts as covered if COMPONENTS has a `dir` equal to the entry
// name, or nested under it (`${entry}/...`) - entries like `node` bundle
// several flat docs pages (node-icon, node-description, ...) rather than
// mapping 1:1 by name. `NARRATIVE_ONLY` is an escape hatch for a vite entry
// that is deliberately docs-only-by-prose with no generated props table at
// all (none today - kept for the next one, e.g. a future compound component
// documented like NodePanel).
//
// Wired into apps/docs/package.json's `generate:ui-api` script, right after
// the generator runs, so `dev` / `build` / `typecheck` all catch the drift.

import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const documentsRoot = path.resolve(here, '..');
const repoRoot = path.resolve(documentsRoot, '../..');
const viteConfigPath = path.resolve(repoRoot, 'packages/ui/vite.config.mts');
const generatorPath = path.resolve(here, 'generate-ui-api.mjs');

const NARRATIVE_ONLY = new Set([]);

function extractComponentEntries(source) {
  const match = /const componentEntries = \[([\s\S]*?)] as const;/.exec(source);
  if (!match) throw new Error('Could not find `componentEntries` in packages/ui/vite.config.mts');
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

function extractComponentDirectories(source) {
  const match = /const COMPONENTS = \[([\s\S]*?)];/.exec(source);
  if (!match) throw new Error('Could not find `COMPONENTS` in generate-ui-api.mjs');
  return [...match[1].matchAll(/dir:\s*'([^']+)'/g)].map((m) => m[1]);
}

function extractComponentSlugs(source) {
  const match = /const COMPONENTS = \[([\s\S]*?)];/.exec(source);
  if (!match) throw new Error('Could not find `COMPONENTS` in generate-ui-api.mjs');
  return [...match[1].matchAll(/slug:\s*'([^']+)'/g)].map((m) => m[1]);
}

const componentEntries = extractComponentEntries(readFileSync(viteConfigPath, 'utf8'));
const generatorSource = readFileSync(generatorPath, 'utf8');
const componentDirectories = extractComponentDirectories(generatorSource);
const componentSlugs = extractComponentSlugs(generatorSource);

const missing = componentEntries.filter((entry) => {
  if (NARRATIVE_ONLY.has(entry)) return false;
  return !componentDirectories.some((directory) => directory === entry || directory.startsWith(`${entry}/`));
});

// A COMPONENTS entry only produces data - nothing renders it unless an MDX
// page passes the slug to PropsTable / CssVariablesTable. Without this leg,
// adding a generator entry with no page passes the whole build silently.
const contentRoot = path.resolve(documentsRoot, 'src/content/docs');
const pageSources = globSync('**/*.mdx', { cwd: contentRoot }).map((file) =>
  readFileSync(path.resolve(contentRoot, file), 'utf8'),
);
const unrendered = componentSlugs.filter(
  (slug) => !pageSources.some((source) => source.includes(`slug="${slug}"`)),
);

if (missing.length > 0) {
  console.error('error: componentEntries in packages/ui/vite.config.mts have no matching COMPONENTS entry.\n');
  for (const entry of missing) {
    console.error(`  - ${entry}`);
  }
  console.error(
    '\nAdd a COMPONENTS entry in apps/docs/scripts/generate-ui-api.mjs with a matching `dir`, ' +
      'or add the entry to NARRATIVE_ONLY in this script if it is deliberately prose-only.',
  );
  process.exitCode = 1;
}

if (unrendered.length > 0) {
  console.error('error: COMPONENTS entries in generate-ui-api.mjs are rendered by no MDX page.\n');
  for (const slug of unrendered) {
    console.error(`  - ${slug}`);
  }
  console.error(
    '\nAdd a docs page that uses <PropsTable slug="..."> / <CssVariablesTable slug="...">, ' +
      'or remove the generator entry.',
  );
  process.exitCode = 1;
}

if (missing.length === 0 && unrendered.length === 0) {
  console.log(
    `✓ component coverage ok — ${componentEntries.length} vite entries and ${componentSlugs.length} docs slugs cross-checked.`,
  );
}
