/**
 * Token-usage lint.
 *
 * Validates every `var(--name)` in app/package sources against the set of
 * names that actually exist somewhere: the built token dist, custom
 * properties defined in source files (CSS or inline styles / setProperty in
 * TS/TSX), the provisional-token registry, and runtime names injected by
 * third-party libraries.
 *
 * Rules:
 *  1. `var(--name)` where `--name` is defined nowhere -> error.
 *  2. `var(--wb-… , fallback)` / `var(--ax-… , fallback)` -> error unless the
 *     line carries a `/* fallback-ok: reason *\/` annotation. Fallbacks on
 *     system tokens mask exactly the typos rule 1 exists to catch.
 *
 * Usage:
 *   node scripts/lint-token-usage.mjs             # full scan (CI)
 *   node scripts/lint-token-usage.mjs --files a.css b.tsx   # staged files only
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const TOKENS_DIRECTORY = path.resolve(fileURLToPath(import.meta.url), '../..');
const REPO_ROOT = path.resolve(TOKENS_DIRECTORY, '../..');
const DISTRIBUTION_DIRECTORY = path.join(TOKENS_DIRECTORY, 'dist');
const PROVISIONAL_FILE = path.join(TOKENS_DIRECTORY, 'tokens-provisional.json');

// Custom properties set at runtime by third-party libraries.
const EXTERNAL_NAMES = new Set([
  // Base UI positioner writes the anchor dimensions onto the popup element.
  '--anchor-width',
  '--anchor-height',
]);

const SCAN_ROOTS = ['packages', 'apps']
  .flatMap((group) => {
    const groupDirectory = path.join(REPO_ROOT, group);
    return readdirSync(groupDirectory).map((name) => path.join(groupDirectory, name, 'src'));
  })
  .filter((directory) => !directory.includes(`apps${path.sep}docs`) && existsSync(directory));

const SOURCE_EXTENSIONS = new Set(['.css', '.scss', '.ts', '.tsx']);

const USE_RE = /var\(\s*(--[A-Za-z0-9_-]+)/g;
const CSS_DEFINITION_RE = /(--[A-Za-z0-9_-]+)\s*:/g;
const JS_DEFINITION_RE = /['"](--[A-Za-z0-9_-]+)['"]\s*[:,]/g;
const SET_PROPERTY_RE = /setProperty\(\s*['"](--[A-Za-z0-9_-]+)['"]/g;
const SYSTEM_FALLBACK_RE = /var\(\s*(--(?:wb|ax)-[A-Za-z0-9_-]+)\s*,/g;
const FALLBACK_OK_RE = /\/\*\s*fallback-ok:\s*[^*]+\*\//;

function walk(directory, out = []) {
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SOURCE_EXTENSIONS.has(path.extname(full))) out.push(full);
  }
  return out;
}

function collectMatches(regex, text, into) {
  for (const match of text.matchAll(regex)) into.add(match[1]);
}

function ensureDistribution() {
  if (existsSync(DISTRIBUTION_DIRECTORY) && readdirSync(DISTRIBUTION_DIRECTORY).length > 0) return;
  console.log('lint-token-usage: tokens dist missing, building it first…');
  const result = spawnSync('pnpm', ['run', 'build'], { cwd: TOKENS_DIRECTORY, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error('lint-token-usage: tokens build failed, cannot lint.');
  }
}

function loadProvisionalNames() {
  if (!existsSync(PROVISIONAL_FILE)) return new Set();
  const registry = JSON.parse(readFileSync(PROVISIONAL_FILE, 'utf8'));
  return new Set(Object.keys(registry.tokens ?? {}));
}

ensureDistribution();

const allSourceFiles = SCAN_ROOTS.flatMap((directory) => walk(directory));

const defined = new Set(EXTERNAL_NAMES);
for (const name of loadProvisionalNames()) defined.add(name);
for (const file of walk(DISTRIBUTION_DIRECTORY).filter((f) => f.endsWith('.css'))) {
  collectMatches(CSS_DEFINITION_RE, readFileSync(file, 'utf8'), defined);
}
for (const file of allSourceFiles) {
  const text = readFileSync(file, 'utf8');
  if (file.endsWith('.css') || file.endsWith('.scss')) {
    collectMatches(CSS_DEFINITION_RE, text, defined);
  } else {
    collectMatches(JS_DEFINITION_RE, text, defined);
    collectMatches(SET_PROPERTY_RE, text, defined);
  }
}

const filesArgumentIndex = process.argv.indexOf('--files');
const filesToLint =
  filesArgumentIndex === -1
    ? allSourceFiles
    : process.argv
        .slice(filesArgumentIndex + 1)
        .map((file) => path.resolve(file))
        .filter((file) => SOURCE_EXTENSIONS.has(path.extname(file)) && existsSync(file));

const errors = [];
const fallbackOkInventory = [];
let axUsageCount = 0;

for (const file of filesToLint) {
  const relative = path.relative(REPO_ROOT, file);
  const lines = readFileSync(file, 'utf8').split('\n');
  for (const [index, line] of lines.entries()) {
    const location = `${relative}:${index + 1}`;
    for (const match of line.matchAll(USE_RE)) {
      const name = match[1];
      if (name.startsWith('--ax-')) axUsageCount += 1;
      if (!defined.has(name)) {
        errors.push(
          `${location}  unknown custom property ${name} (defined nowhere: not in tokens dist, sources, or the provisional registry)`,
        );
      }
    }
    for (const match of line.matchAll(SYSTEM_FALLBACK_RE)) {
      if (FALLBACK_OK_RE.test(line)) {
        fallbackOkInventory.push(`${location}  ${match[1]}`);
      } else {
        errors.push(
          `${location}  fallback on system token ${match[1]} — fallbacks mask typos; drop it or annotate the line with /* fallback-ok: reason */`,
        );
      }
    }
  }
}

if (fallbackOkInventory.length > 0) {
  console.log(`fallback-ok inventory (${fallbackOkInventory.length}):`);
  for (const entry of fallbackOkInventory) console.log(`  ${entry}`);
}
console.log(
  `lint-token-usage: ${filesToLint.length} files, ${axUsageCount} var(--ax-*) usages remaining (DS 2.0 migration meter).`,
);

if (errors.length > 0) {
  console.error(`\n${errors.length} token-usage error(s):`);
  for (const error of errors) console.error(`  ${error}`);
  process.exitCode = 1;
} else {
  console.log('lint-token-usage: OK');
}
