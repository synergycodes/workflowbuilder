// Cross-checks the documented component surface: every publishable subpath in
// packages/ui/vite.config.mts has a COMPONENTS entry, and every COMPONENTS
// entry is rendered by an MDX page. Without it a component ships to npm with
// no docs page and nothing in the build complains. Runs as part of
// `generate:ui-api`.

import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { COMPONENTS } from './ui-components.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const documentsRoot = path.resolve(here, '..');
const repoRoot = path.resolve(documentsRoot, '../..');
const viteConfigPath = path.resolve(repoRoot, 'packages/ui/vite.config.mts');

const NARRATIVE_ONLY = new Set([]);

// Read as text, not imported - it is TypeScript. Empty means the shape changed.
function extractComponentEntries(source) {
  const match = /const componentEntries = \[([\s\S]*?)] as const;/.exec(source);
  if (!match) throw new Error('Could not find `componentEntries` in packages/ui/vite.config.mts');
  const entries = [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  if (entries.length === 0) {
    throw new Error('Extracted zero entries from `componentEntries` in packages/ui/vite.config.mts');
  }
  return entries;
}

const componentEntries = extractComponentEntries(readFileSync(viteConfigPath, 'utf8'));
const componentDirectories = COMPONENTS.map((component) => component.dir).filter(Boolean);
const componentSlugs = COMPONENTS.map((component) => component.slug);

const missing = componentEntries.filter((entry) => {
  if (NARRATIVE_ONLY.has(entry)) return false;
  return !componentDirectories.some((directory) => directory === entry || directory.startsWith(`${entry}/`));
});

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
