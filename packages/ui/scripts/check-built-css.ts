/**
 * Guards against two bug classes in built CSS output.
 *
 * Runs after `vite build` so a regression fails the release even if it slips
 * past review or a build-tool transform introduces it.
 *
 * 1. `var()`'s first argument must be a `<custom-property-name>` (a dashed-ident) -
 *    never another function. Browsers silently invalidate `var(var(--foo))` and fall
 *    back, which is how WB-222 shipped a wrong snackbar icon color.
 * 2. Every component rule must live inside an `@layer` block. Unlayered CSS beats
 *    layered CSS regardless of specificity, so a rule that escapes `ui.base` /
 *    `ui.component` silently wins the cascade - this is how WB-190 shipped
 *    decision-node ports collapsed to ~5px (see `handle.module.css`, `css-layers.md`).
 *
 * These are the only lines of defense for these bug classes today; source-level lint
 * rules (e.g. a stylelint `no-invalid-var` / a custom "no rule outside @layer" rule)
 * would catch them earlier but none is configured yet.
 *
 * Exits non-zero on any match.
 */
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const distributionDirectory = path.resolve(currentDirectory, '../dist');

type Hit = { line: number; column: number; snippet: string };

function locate(content: string, index: number): { line: number; column: number } {
  const upTo = content.slice(0, index);
  const line = upTo.split('\n').length;
  const column = index - upTo.lastIndexOf('\n');
  return { line, column };
}

function snippetAt(content: string, index: number): string {
  return content.slice(Math.max(0, index - 12), index + 48).replaceAll(/\s+/g, ' ');
}

// --- Check 1: var(var(...)) -------------------------------------------------

// Matches `var(` followed by optional whitespace and another `var(` —
// covers the minified `var(var(` and the unminified `var( var(` /
// `var(\n  var(`. Comments inside CSS values are uncommon enough that
// false positives aren't a real concern.
const nestedVariablePattern = /var\(\s*var\(/g;

function checkNoNestedVariable(files: string[]): Array<{ file: string; hits: Hit[] }> {
  const failures: Array<{ file: string; hits: Hit[] }> = [];

  for (const file of files) {
    const content = readFileSync(path.resolve(distributionDirectory, file), 'utf8');
    const hits: Hit[] = [];

    for (const match of content.matchAll(nestedVariablePattern)) {
      const { line, column } = locate(content, match.index);
      hits.push({ line, column, snippet: snippetAt(content, match.index) });
    }

    if (hits.length > 0) failures.push({ file, hits });
  }

  return failures;
}

// --- Check 2: no rule outside @layer ----------------------------------------

/**
 * Files copied verbatim from `@workflowbuilder/ui-tokens` (see
 * `packages/ui/vite.config.mts`'s static-copy list). They're auto-generated
 * design-token primitives (`:root` / `html[data-theme]` blocks of custom
 * properties only) and predate/sit outside the `ui.base` / `ui.component`
 * contract documented in `css-layers.md` - they're meant to load before it.
 */
const ALLOWLISTED_FILES = new Set(['tokens.css', 'numerals-mode-1.css', 'primitives-mode-1.css']);

/**
 * `date-picker.module.css` documents an intentionally unlayered override (see
 * the comment above `.calendar :global(.rdp-root)` in that file) so it beats
 * the also-unlayered `react-day-picker/style.css` it themes, by specificity
 * rather than load order. Both compile to selectors/keyframes containing
 * `rdp-`, so that substring is the stable signal across every dist file the
 * date-picker chunk gets bundled into (per-component chunk, the combined
 * root `index.css`, etc.) - CSS-module hashes in the scoping prefix change
 * between builds, a fixed selector list would not.
 */
const isDeliberateDatePickerOverride = (selector: string): boolean => selector.includes('rdp-');

/** Skips a balanced `{ ... }` body (as well as quoted strings inside it) and returns the index just past the closing `}`. */
function skipBlock(content: string, openBraceIndex: number): number {
  let depth = 1;
  let cursor = openBraceIndex + 1;
  while (cursor < content.length && depth > 0) {
    const char = content[cursor];
    switch (char) {
      case "'":
      case '"': {
        const quote = char;
        cursor++;
        while (cursor < content.length && content[cursor] !== quote) {
          if (content[cursor] === '\\') cursor++;
          cursor++;
        }
        break;
      }
      case '{': {
        depth++;
        break;
      }
      case '}': {
        depth--;
        break;
      }
      default: {
        break;
      }
    }
    cursor++;
  }
  return cursor;
}

function findTopLevelViolations(content: string): Hit[] {
  const hits: Hit[] = [];
  // Comments never carry rules of their own; blank them out (preserving length and
  // newlines) so they can't be mistaken for a selector or interfere with offsets.
  const source = content.replaceAll(/\/\*[\s\S]*?\*\//g, (match) => match.replaceAll(/[^\n]/g, ' '));
  const length = source.length;
  let cursor = 0;

  while (cursor < length) {
    const char = source[cursor];
    if (/\s/.test(char)) {
      cursor++;
      continue;
    }

    if (char === '@') {
      const nameMatch = /^@[\w-]+/.exec(source.slice(cursor));
      const atRuleName = nameMatch ? nameMatch[0] : '@';
      let headerEnd = cursor;
      while (headerEnd < length && source[headerEnd] !== '{' && source[headerEnd] !== ';') headerEnd++;

      if (source[headerEnd] === ';') {
        // A statement, e.g. the `@layer ui.base, ui.component;` order declaration - no body to check.
        cursor = headerEnd + 1;
        continue;
      }

      if (source[headerEnd] === '{') {
        const header = source.slice(cursor, headerEnd).trim();
        const blockEnd = skipBlock(source, headerEnd);
        // `@layer name { ... }` establishes a layer - everything inside is layered by
        // definition, so it's out of scope for this check (its contents are still
        // reachable directly by consumers, but that's the CSS-module scoping's job).
        if (atRuleName !== '@layer' && !isDeliberateDatePickerOverride(header)) {
          hits.push({ ...locate(content, cursor), snippet: snippetAt(content, cursor) });
        }
        cursor = blockEnd;
        continue;
      }

      // Malformed/unterminated at-rule; nothing more to scan.
      break;
    }

    const openBrace = source.indexOf('{', cursor);
    if (openBrace === -1) break;
    const selector = source.slice(cursor, openBrace).trim();
    const blockEnd = skipBlock(source, openBrace);

    if (selector !== ':root' && !isDeliberateDatePickerOverride(selector)) {
      hits.push({ ...locate(content, cursor), snippet: snippetAt(content, cursor) });
    }
    cursor = blockEnd;
  }

  return hits;
}

function checkLayerCoverage(files: string[]): Array<{ file: string; hits: Hit[] }> {
  const failures: Array<{ file: string; hits: Hit[] }> = [];

  for (const file of files) {
    if (ALLOWLISTED_FILES.has(path.basename(file))) continue;

    const content = readFileSync(path.resolve(distributionDirectory, file), 'utf8');
    const hits = findTopLevelViolations(content);

    if (hits.length > 0) failures.push({ file, hits });
  }

  return failures;
}

// --- Run both checks ---------------------------------------------------------

function report(title: string, failures: Array<{ file: string; hits: Hit[] }>, hint: string): boolean {
  if (failures.length === 0) {
    console.log(`✔ ${title}`);
    return true;
  }

  const total = failures.reduce((n, f) => n + f.hits.length, 0);
  console.error(`\n✖ Found ${total} issue(s): ${title}\n`);
  for (const { file, hits } of failures) {
    console.error(`  packages/ui/dist/${file}`);
    for (const { line, column, snippet } of hits) {
      console.error(`    ${line}:${column}  …${snippet}…`);
    }
  }
  console.error(`\n${hint}\n`);
  return false;
}

const files = globSync('**/*.css', { cwd: distributionDirectory });

const nestedVariableOk = report(
  'Built CSS: no invalid var(var(...)) calls',
  checkNoNestedVariable(files),
  'The first argument of var() must be a --custom-property name. See WB-222.',
);

const layerCoverageOk = report(
  'Built CSS: every rule sits inside an @layer block',
  checkLayerCoverage(files),
  'Unlayered CSS wins the cascade over layered CSS regardless of specificity - wrap the ' +
    'source rule in `@layer ui.base { ... }` or `@layer ui.component { ... }` (see ' +
    'packages/ui/css-layers.md). If this is a deliberate exception, allowlist it above ' +
    'with a comment explaining why.',
);

if (!nestedVariableOk || !layerCoverageOk) {
  process.exitCode = 1;
}
