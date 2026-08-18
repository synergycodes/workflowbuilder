/**
 * Rewrites `var(--ax-…)` usages in app/package sources to their DS 2.0
 * `var(--wb-…)` targets, following codemod-map.json (decision: fix usages at
 * the source instead of shipping a compatibility bridge).
 *
 * Replacement order per usage:
 *   1. exact pair from `renames` / `removed` (with a replacement) / `dimensions`
 *   2. `prefixRules` (primitives keep their names under the new namespace)
 *   3. `manual` patterns and replacement-less removals are never rewritten —
 *      they are reported for the accompanying hand-edit.
 *
 * Dry-run by default; pass --write to modify files.
 *
 * Usage: node scripts/codemod-usages.mjs [--write]
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const TOKENS_DIRECTORY = path.resolve(fileURLToPath(import.meta.url), '../..');
const REPO_ROOT = path.resolve(TOKENS_DIRECTORY, '../..');
const WRITE = process.argv.includes('--write');

const map = JSON.parse(readFileSync(path.join(TOKENS_DIRECTORY, 'codemod-map.json'), 'utf8'));

const exactPairs = new Map();
for (const entry of map.renames) exactPairs.set(entry.oldCss, entry.newCss);
for (const entry of map.dimensions ?? []) exactPairs.set(entry.oldCss, entry.newCss);
const removedWithoutReplacement = new Set();
for (const entry of map.removed) {
  if (entry.replacementCss) exactPairs.set(entry.oldCss, entry.replacementCss);
  else removedWithoutReplacement.add(entry.oldCss);
}
const manualPrefixes = (map.manual ?? []).map((entry) => entry.pattern.replace(/\*$/, ''));

const SOURCE_EXTENSIONS = new Set(['.css', '.scss', '.ts', '.tsx']);
const scanRoots = ['packages', 'apps']
  .flatMap((group) => {
    const groupDirectory = path.join(REPO_ROOT, group);
    return readdirSync(groupDirectory).map((name) => path.join(groupDirectory, name, 'src'));
  })
  .filter((directory) => !directory.includes(`apps${path.sep}docs`));

function walk(directory, out = []) {
  let entries;
  try {
    entries = readdirSync(directory);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SOURCE_EXTENSIONS.has(path.extname(full))) out.push(full);
  }
  return out;
}

const USE_RE = /var\(\s*(--ax-[A-Za-z0-9_-]+)/g;

const rewriteCounts = new Map();
const needsHand = new Map();
let changedFiles = 0;

for (const file of scanRoots.flatMap((directory) => walk(directory))) {
  const text = readFileSync(file, 'utf8');
  let fileChanged = false;

  const rewritten = text.replaceAll(USE_RE, (match, name) => {
    const manual = manualPrefixes.some((prefix) => name.startsWith(prefix));
    if (manual || removedWithoutReplacement.has(name)) {
      const reason = manual ? 'manual' : 'removed without replacement';
      const key = `${name} (${reason})`;
      needsHand.set(key, [...(needsHand.get(key) ?? []), path.relative(REPO_ROOT, file)]);
      return match;
    }

    let target = exactPairs.get(name);
    if (!target) {
      const rule = map.prefixRules.find((candidate) => name.startsWith(candidate.oldCssPrefix));
      if (rule) target = name.replace(rule.oldCssPrefix, rule.newCssPrefix);
    }
    if (!target) return match;

    rewriteCounts.set(target, (rewriteCounts.get(target) ?? 0) + 1);
    fileChanged = true;
    return match.replace(name, target);
  });

  if (fileChanged) {
    changedFiles += 1;
    if (WRITE) writeFileSync(file, rewritten);
  }
}

const totalRewrites = [...rewriteCounts.values()].reduce((sum, count) => sum + count, 0);
console.log(
  `codemod-usages (${WRITE ? 'write' : 'dry-run'}): ${totalRewrites} usages across ${changedFiles} files ` +
    `(${rewriteCounts.size} distinct targets).`,
);
if (needsHand.size > 0) {
  console.log(`needs a hand-edit (${needsHand.size} names):`);
  for (const [name, files] of needsHand) console.log(`  ${name} — ${[...new Set(files)].join(', ')}`);
}
if (!WRITE) console.log('No files modified. Re-run with --write to apply.');
