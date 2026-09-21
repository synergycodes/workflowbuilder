/**
 * Guards against known bug classes in built CSS output.
 *
 * Runs after `vite build` so a regression fails the release even if it slips
 * past review or a build-tool transform introduces it.
 *
 * 1. `var()`'s first argument must be a `<custom-property-name>` (a dashed-ident) -
 *    never another function, an undashed name, or nothing. Browsers silently
 *    invalidate the declaration and fall back, which is how WB-222 shipped a
 *    wrong snackbar icon color (`var(var(--foo))`).
 * 2. Every rule must live inside an `@layer` block - including `:root` variable
 *    defaults (layered defaults lose to any unlayered consumer override, which
 *    is the override contract). Unlayered CSS beats layered CSS regardless of
 *    specificity, so a rule that escapes `ui.base` / `ui.component` silently
 *    wins the cascade - this is how WB-190 shipped decision-node ports
 *    collapsed to ~5px (see `css-layers.md`).
 * 3. Every stylesheet must LEAD with the full `@layer` order statement. The first
 *    use of a layer name fixes the order, so a component stylesheet that loads
 *    before the statement inverts the cascade (ui.base beats ui.component) -
 *    `combine-css-bundle.mts` stamps the statement into every file; this check
 *    keeps the stamp honest.
 * 4. Only the layer names declared in `src/styles/layers.css` may appear. An
 *    unknown name (a typo) lands AFTER the declared order and silently wins
 *    the cascade.
 * 5. Every `*.css` entry in package.json `exports` must exist in dist, and no
 *    dist stylesheet may use `@import` - a relative import breaks silently when
 *    a file is copied out alone, and constructed stylesheets ignore imports.
 *
 * These are the only lines of defense for these bug classes today; source-level lint
 * rules would catch some of them earlier but none is configured yet.
 *
 * Exits non-zero on any match.
 */
import { existsSync, globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import postcss, { type AtRule, type ChildNode } from 'postcss';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageDirectory = path.resolve(currentDirectory, '..');
const distributionDirectory = path.resolve(packageDirectory, 'dist');

type Hit = { line: number; column: number; snippet: string };
type FailureReport = { file: string; hits: Hit[] };

const layerOrderStatement = postcss
  .parse(readFileSync(path.resolve(packageDirectory, 'src/styles/layers.css'), 'utf8'))
  .nodes.find((node): node is AtRule => node.type === 'atrule' && node.name === 'layer' && node.nodes === undefined);
if (!layerOrderStatement) {
  throw new Error('src/styles/layers.css must contain a bare `@layer a, b;` order statement');
}
const KNOWN_LAYERS = layerOrderStatement.params.split(',').map((name) => name.trim());
const KNOWN_LAYER_SET = new Set(KNOWN_LAYERS);

function locate(content: string, index: number): { line: number; column: number } {
  const upTo = content.slice(0, index);
  const line = upTo.split('\n').length;
  const column = index - upTo.lastIndexOf('\n');
  return { line, column };
}

function snippetAt(content: string, index: number): string {
  return content.slice(Math.max(0, index - 12), index + 48).replaceAll(/\s+/g, ' ');
}

function hitFor(node: ChildNode | undefined): Hit {
  if (!node) return { line: 0, column: 0, snippet: '(no CSS rules found)' };

  const start = node.source?.start;
  return {
    line: start?.line ?? 0,
    column: start?.column ?? 0,
    snippet: node.toString().slice(0, 60).replaceAll(/\s+/g, ' '),
  };
}

// --- Check 1: var() first argument is a dashed ident --------------------------

const malformedVariablePattern = /var\(\s*(?!--)/g;

function checkVariableFirstArgument(files: string[]): FailureReport[] {
  const failures: FailureReport[] = [];

  for (const file of files) {
    const content = readFileSync(path.resolve(distributionDirectory, file), 'utf8');
    const hits: Hit[] = [];

    for (const match of content.matchAll(malformedVariablePattern)) {
      const { line, column } = locate(content, match.index);
      hits.push({ line, column, snippet: snippetAt(content, match.index) });
    }

    if (hits.length > 0) failures.push({ file, hits });
  }

  return failures;
}

// --- Check 2: no rule outside @layer ----------------------------------------

function findTopLevelViolations(content: string): Hit[] {
  const hits: Hit[] = [];

  for (const node of postcss.parse(content).nodes) {
    switch (node.type) {
      case 'atrule': {
        const isStatement = node.nodes === undefined;
        if (node.name === 'layer' || isStatement) break;
        hits.push(hitFor(node));
        break;
      }
      case 'rule': {
        hits.push(hitFor(node));
        break;
      }
      default: {
        break;
      }
    }
  }

  return hits;
}

function checkLayerCoverage(files: string[]): FailureReport[] {
  const failures: FailureReport[] = [];

  for (const file of files) {
    const content = readFileSync(path.resolve(distributionDirectory, file), 'utf8');
    const hits = findTopLevelViolations(content);

    if (hits.length > 0) failures.push({ file, hits });
  }

  return failures;
}

// --- Check 3: the layer-order statement leads every file ----------------------

function isOrderStatement(node: ChildNode | undefined): boolean {
  return (
    node?.type === 'atrule' &&
    node.name === 'layer' &&
    node.nodes === undefined &&
    node.params
      .split(',')
      .map((name) => name.trim())
      .join(',') === KNOWN_LAYERS.join(',')
  );
}

function checkOrderStatementFirst(files: string[]): FailureReport[] {
  const failures: FailureReport[] = [];

  for (const file of files) {
    const content = readFileSync(path.resolve(distributionDirectory, file), 'utf8');
    const first = postcss.parse(content).nodes.find((node) => node.type !== 'comment');

    if (!isOrderStatement(first)) failures.push({ file, hits: [hitFor(first)] });
  }

  return failures;
}

// --- Check 4: only known layer names ------------------------------------------

function checkKnownLayerNames(files: string[]): FailureReport[] {
  const failures: FailureReport[] = [];

  for (const file of files) {
    const content = readFileSync(path.resolve(distributionDirectory, file), 'utf8');
    const hits: Hit[] = [];

    postcss.parse(content).walkAtRules('layer', (atRule) => {
      const names = atRule.params.split(',').map((name) => name.trim());
      if (names.some((name) => !KNOWN_LAYER_SET.has(name))) hits.push(hitFor(atRule));
    });

    if (hits.length > 0) failures.push({ file, hits });
  }

  return failures;
}

// --- Check 5: exported entrypoints exist, dist CSS is import-free --------------

// Walks an exports-map value, collecting every string target ending in .css -
// covers plain strings and conditional-export objects ({ import, require,
// default, ... }) at any nesting depth.
function collectCssTargets(value: unknown, into: string[]): void {
  if (typeof value === 'string') {
    if (value.endsWith('.css')) into.push(value);
    return;
  }
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) collectCssTargets(nested, into);
  }
}

function checkPublishedSurface(files: string[]): FailureReport[] {
  const failures: FailureReport[] = [];

  const packageJson = JSON.parse(readFileSync(path.resolve(packageDirectory, 'package.json'), 'utf8')) as {
    exports?: Record<string, unknown>;
  };
  for (const [specifier, target] of Object.entries(packageJson.exports ?? {})) {
    const cssTargets: string[] = [];
    collectCssTargets(target, cssTargets);

    for (const cssTarget of cssTargets) {
      if (!existsSync(path.resolve(packageDirectory, cssTarget))) {
        failures.push({
          file: cssTarget,
          hits: [{ line: 0, column: 0, snippet: `missing file for exports["${specifier}"]` }],
        });
      }
    }
  }

  if (files.length === 0) {
    failures.push({
      file: '(dist)',
      hits: [{ line: 0, column: 0, snippet: 'no CSS emitted at all' }],
    });
  }

  for (const file of files) {
    const hits: Hit[] = [];

    postcss.parse(readFileSync(path.resolve(distributionDirectory, file), 'utf8')).walkAtRules('import', (atRule) => {
      hits.push(hitFor(atRule));
    });

    if (hits.length > 0) failures.push({ file, hits });
  }

  return failures;
}

// --- Run all checks ---------------------------------------------------------

function report(title: string, failures: FailureReport[], hint: string): boolean {
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

const results = [
  report(
    'Built CSS: every var() takes a --custom-property name',
    checkVariableFirstArgument(files),
    'The first argument of var() must be a --custom-property name - browsers silently ' +
      'discard the whole declaration otherwise. See WB-222.',
  ),
  report(
    'Built CSS: every rule sits inside an @layer block',
    checkLayerCoverage(files),
    'Unlayered CSS wins the cascade over layered CSS regardless of specificity - wrap the ' +
      'source rule in `@layer ui.base { ... }` or `@layer ui.component { ... }` (see ' +
      'packages/ui/css-layers.md). `:root` defaults are wrapped by the build ' +
      '(postcss-layer-root-defaults.mts); a hit here means CSS bypassed that pipeline.',
  ),
  report(
    'Built CSS: every file leads with the @layer order statement',
    checkOrderStatementFirst(files),
    'Each dist stylesheet must begin with the full order statement from src/styles/layers.css - ' +
      'combine-css-bundle.mts stamps it; a missing stamp reintroduces the inverted-cascade bug.',
  ),
  report(
    `Built CSS: only known layer names (${KNOWN_LAYERS.join(', ')})`,
    checkKnownLayerNames(files),
    'An unknown layer name lands AFTER the declared order and silently wins the cascade - fix the typo.',
  ),
  report(
    'Built CSS: exported entrypoints exist and no stylesheet uses @import',
    checkPublishedSurface(files),
    'package.json exports must point at real files, and dist CSS must be self-contained - ' +
      'a relative @import breaks silently when a file is copied out of the package.',
  ),
];

if (results.includes(false)) {
  process.exitCode = 1;
}
