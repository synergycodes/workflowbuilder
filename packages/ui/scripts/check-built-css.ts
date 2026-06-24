/**
 * Guard against the WB-222 bug class in built CSS output.
 *
 * Mirrors the `local/no-invalid-var` stylelint rule but runs after `vite
 * build`, so the release fails even if the source-level check is bypassed
 * (disabled rule, --no-verify commit, a build-tool transform that
 * regresses, etc.). The rule: `var()`'s first argument must be a
 * `<custom-property-name>` (a dashed-ident) — never another function.
 * Browsers silently invalidate `var(var(--foo))` and fall back, which is
 * how WB-222 shipped a wrong snackbar icon color.
 *
 * Run after `vite build`. Exits non-zero on any match.
 */
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const distributionDirectory = path.resolve(currentDirectory, '../dist');

// Matches `var(` followed by optional whitespace and another `var(` —
// covers the minified `var(var(` and the unminified `var( var(` /
// `var(\n  var(`. Comments inside CSS values are uncommon enough that
// false positives aren't a real concern.
const pattern = /var\(\s*var\(/g;

type Hit = { line: number; column: number; snippet: string };

const failures: Array<{ file: string; hits: Hit[] }> = [];

for (const file of globSync('**/*.css', { cwd: distributionDirectory })) {
  const content = readFileSync(path.resolve(distributionDirectory, file), 'utf8');
  const hits: Hit[] = [];

  for (const match of content.matchAll(pattern)) {
    const upTo = content.slice(0, match.index);
    const line = upTo.split('\n').length;
    const column = match.index - upTo.lastIndexOf('\n');
    const snippet = content.slice(Math.max(0, match.index - 12), match.index + 48).replaceAll(/\s+/g, ' ');
    hits.push({ line, column, snippet });
  }

  if (hits.length > 0) failures.push({ file, hits });
}

if (failures.length === 0) {
  console.log('✔ Built CSS: no invalid var(var(...)) calls');
} else {
  const total = failures.reduce((n, f) => n + f.hits.length, 0);
  console.error(`\n✖ Found ${total} invalid var(var(...)) call(s) in built CSS output:\n`);
  for (const { file, hits } of failures) {
    console.error(`  packages/ui/dist/${file}`);
    for (const { line, column, snippet } of hits) {
      console.error(`    ${line}:${column}  …${snippet}…`);
    }
  }
  console.error('\nThe first argument of var() must be a --custom-property name. See WB-222.\n');
  process.exitCode = 1;
}
