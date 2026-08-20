/**
 * Rewrites `var(--ax-…)` usages in app/package sources to their DS 2.0
 * `var(--wb-…)` targets, following codemod-map.json (decision: fix usages at
 * the source instead of shipping a compatibility bridge).
 *
 * Replacement order per usage:
 *   1. exact pair from `renames` / `removed` (with a replacement) / `dimensions`
 *   2. `manual` patterns and replacement-less removals — never rewritten,
 *      reported for the accompanying hand-edit
 *   3. `prefixRules` (primitives keep their names under the new namespace)
 * Anything that matches none of the above is reported as unmapped, split into
 * names that exist in today's token dist (a real gap that will dangle after
 * the pipeline switch) and component-local names that need no rewrite.
 *
 * Dry-run by default; pass --write to modify files. apps/docs is excluded
 * (not part of the shipped packages; its one usage is handled in the docs
 * workflow separately).
 *
 * Usage: node scripts/codemod-usages.mjs [--write]
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
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
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (SOURCE_EXTENSIONS.has(path.extname(full))) out.push(full);
  }
  return out;
}

const distributionDefinitions = new Set();
for (const file of walk(path.join(TOKENS_DIRECTORY, 'dist'))) {
  if (!file.endsWith('.css')) continue;
  for (const match of readFileSync(file, 'utf8').matchAll(/(--ax-[A-Za-z0-9_-]+)\s*:/g)) {
    distributionDefinitions.add(match[1]);
  }
}

const USE_RE = /var\(\s*(--ax-[A-Za-z0-9_-]+)/g;

const rewriteCounts = new Map();
const needsHand = new Map();
const unmapped = new Map();
let changedFiles = 0;

for (const file of scanRoots.flatMap((directory) => walk(directory))) {
  const text = readFileSync(file, 'utf8');
  let fileChanged = false;

  const rewritten = text.replaceAll(USE_RE, (match, name) => {
    // Exact pairs win over the manual globs: chips-neutral-txt has a clean
    // rename while --ax-chips-* as a family is rebuilt by hand.
    let target = exactPairs.get(name);

    if (!target) {
      const manual = manualPrefixes.some((prefix) => name.startsWith(prefix));
      if (manual || removedWithoutReplacement.has(name)) {
        const reason = manual ? 'manual' : 'removed without replacement';
        const key = `${name} (${reason})`;
        needsHand.set(key, [...(needsHand.get(key) ?? []), path.relative(REPO_ROOT, file)]);
        return match;
      }
      const rule = map.prefixRules.find((candidate) => name.startsWith(candidate.oldCssPrefix));
      if (rule) target = name.replace(rule.oldCssPrefix, rule.newCssPrefix);
    }

    if (!target) {
      unmapped.set(name, (unmapped.get(name) ?? 0) + 1);
      return match;
    }

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
  console.log(`\nneeds a hand-edit (${needsHand.size} names):`);
  for (const [name, files] of needsHand) console.log(`  ${name} — ${[...new Set(files)].join(', ')}`);
}

const gaps = [...unmapped.entries()].filter(([name]) => distributionDefinitions.has(name));
const componentLocal = [...unmapped.entries()].filter(([name]) => !distributionDefinitions.has(name));
const sum = (entries) => entries.reduce((total, [, count]) => total + count, 0);
const byPrefix = (entries) => {
  const groups = new Map();
  for (const [name, count] of entries) {
    const prefix = name.split('-').slice(0, 4).join('-');
    groups.set(prefix, (groups.get(prefix) ?? 0) + count);
  }
  return [...groups.entries()].sort((a, b) => b[1] - a[1]);
};
if (gaps.length > 0) {
  console.log(
    `\nunmapped but defined in today's dist — will dangle after the pipeline switch ` +
      `(${gaps.length} names / ${sum(gaps)} usages; dimensions land with the 2.0 export):`,
  );
  for (const [prefix, count] of byPrefix(gaps)) console.log(`  ${prefix}* — ${count}`);
}
if (componentLocal.length > 0) {
  console.log(
    `\nunmapped component-local names (defined in package sources, no rewrite needed): ` +
      `${componentLocal.length} names / ${sum(componentLocal)} usages.`,
  );
}
if (!WRITE) console.log('\nNo files modified. Re-run with --write to apply.');
