/**
 * Guards against known bug classes in built CSS output.
 *
 * Runs after `vite build` so a regression fails the release even if it slips
 * past review or a build-tool transform introduces it.
 *
 * 1. `var()`'s first argument must be a `<custom-property-name>` (a dashed-ident) -
 *    never another function, an undashed name, or nothing. Browsers silently
 *    invalidate the declaration and fall back.
 * 2. Every rule must live inside an `@layer` block - including `:root` variable
 *    defaults (layered defaults lose to any unlayered consumer override, which
 *    is the override contract). Unlayered CSS beats layered CSS regardless of
 *    specificity, so a rule that escapes `ui.base` / `ui.component` silently
 *    wins the cascade (see `css-layers.md`).
 * 3. Every stylesheet must LEAD with the full `@layer` order statement. The first
 *    use of a layer name fixes the order, so a component stylesheet that loads
 *    before the statement inverts the cascade (ui.base beats ui.component) -
 *    `combine-css-bundle.mts` stamps the statement into every file; this check
 *    keeps the stamp honest.
 * 4. Only the layer names declared in `src/styles/layers.css` may appear. An
 *    unknown name (a typo) lands AFTER the declared order and silently wins
 *    the cascade.
 * 5. Every `*.css` entry in package.json `exports` must exist in dist, no dist
 *    stylesheet may use `@import`, and every non-data `url()` must resolve to a
 *    file in dist. Absolute URLs are rejected on purpose: published styles are
 *    required to remain self-contained and usable without a CDN.
 * 6. The root JS barrel's entry-chunk stylesheet must carry every generated
 *    `@font-face` rule so importing the barrel cannot silently lose the fonts.
 * 7. The SDK's three public-variable defaults must be present inside an
 *    `@layer` so unlayered consumer overrides always win.
 * 8. Workflow Builder variables may use only `--wb-ds-*`, `--wb-sdk-*`, or
 *    `--wb-public-*`, and the legacy shared prefix is forbidden. Unprefixed
 *    component-local and third-party properties such as `--button-*` and
 *    `--anchor-width` remain allowed because they do not claim a shared namespace.
 *
 * These are the only lines of defense for these bug classes today; source-level lint
 * rules would catch some of them earlier but none is configured yet.
 *
 * Exits non-zero on any match.
 */
import { existsSync, globSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import postcss, { AtRule, type ChildNode, type Node } from 'postcss';

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

const SANCTIONED_WORKFLOW_BUILDER_PREFIXES = ['--wb-ds-', '--wb-sdk-', '--wb-public-'];
const LEGACY_VARIABLE_PREFIX = `--${'ax'}-`;

function checkVariableNamespaces(files: string[], targetDistributionDirectory: string): FailureReport[] {
  const failures: FailureReport[] = [];

  for (const file of files) {
    const content = readFileSync(path.resolve(targetDistributionDirectory, file), 'utf8');
    const hits: Hit[] = [];

    postcss.parse(content).walkDecls((declaration) => {
      const names = `${declaration.prop}: ${declaration.value}`.match(/--[\w-]+/g) ?? [];
      const hasInvalidName = names.some(
        (name) =>
          name.startsWith(LEGACY_VARIABLE_PREFIX) ||
          (name.startsWith('--wb-') && !SANCTIONED_WORKFLOW_BUILDER_PREFIXES.some((prefix) => name.startsWith(prefix))),
      );
      if (hasInvalidName) hits.push(hitFor(declaration));
    });

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

const SDK_LAYERED_PUBLIC_DEFAULTS = new Set([
  '--wb-public-form-label-color',
  '--wb-public-form-label-asterisk-color',
  '--wb-public-form-rich-text-color',
]);

function checkSdkPublicDefaultLayerCoverage(files: string[], targetDistributionDirectory: string): FailureReport[] {
  const failures: FailureReport[] = [];
  const found = new Set<string>();

  for (const file of files) {
    const hits: Hit[] = [];
    const content = readFileSync(path.resolve(targetDistributionDirectory, file), 'utf8');

    postcss.parse(content).walkDecls((declaration) => {
      if (!SDK_LAYERED_PUBLIC_DEFAULTS.has(declaration.prop)) return;
      found.add(declaration.prop);

      let ancestor: Node | undefined = declaration.parent;
      while (ancestor && !(ancestor instanceof AtRule && ancestor.name === 'layer')) {
        ancestor = ancestor.parent;
      }
      if (!ancestor) hits.push(hitFor(declaration));
    });

    if (hits.length > 0) failures.push({ file, hits });
  }

  const missing = [...SDK_LAYERED_PUBLIC_DEFAULTS].filter((name) => !found.has(name));
  if (missing.length > 0) {
    failures.push({
      file: '(dist)',
      hits: missing.map((name) => ({ line: 0, column: 0, snippet: `${name} is missing` })),
    });
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

function isExactFileWithin(rootDirectory: string, targetPath: string): boolean {
  const relativeTarget = path.relative(rootDirectory, targetPath);
  if (
    relativeTarget === '' ||
    relativeTarget === '..' ||
    relativeTarget.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeTarget)
  ) {
    return false;
  }

  const segments = relativeTarget.split(path.sep);
  let currentDirectory = rootDirectory;

  for (const [index, segment] of segments.entries()) {
    try {
      const entry = readdirSync(currentDirectory, { withFileTypes: true }).find(({ name }) => name === segment);
      if (!entry) return false;
      if (index === segments.length - 1) return entry.isFile();
      if (!entry.isDirectory()) return false;
      currentDirectory = path.resolve(currentDirectory, segment);
    } catch {
      return false;
    }
  }

  return false;
}

function checkUrlTargets(files: string[], targetDistributionDirectory: string): FailureReport[] {
  const failures: FailureReport[] = [];
  const urlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;

  if (files.length === 0) {
    return [{ file: '(dist)', hits: [{ line: 0, column: 0, snippet: 'no CSS emitted at all' }] }];
  }

  for (const file of files) {
    const content = readFileSync(path.resolve(targetDistributionDirectory, file), 'utf8');
    const hits: Hit[] = [];

    postcss.parse(content).walkDecls((declaration) => {
      for (const match of declaration.value.matchAll(urlPattern)) {
        const reference = (match[1] ?? match[2] ?? match[3]).trim();
        if (reference.toLowerCase().startsWith('data:')) continue;

        if (/^[a-z][a-z\d+.-]*:/i.test(reference) || reference.startsWith('/')) {
          hits.push(hitFor(declaration));
          continue;
        }

        let targetPath = '';
        try {
          const fileReference = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
          targetPath = path.resolve(targetDistributionDirectory, path.dirname(file), fileReference);
        } catch {
          hits.push(hitFor(declaration));
          continue;
        }

        if (!isExactFileWithin(targetDistributionDirectory, targetPath)) hits.push(hitFor(declaration));
      }
    });

    if (hits.length > 0) failures.push({ file, hits });
  }

  return failures;
}

function countFontFaces(filePath: string): number {
  let count = 0;
  postcss.parse(readFileSync(filePath, 'utf8')).walkAtRules('font-face', () => {
    count += 1;
  });
  return count;
}

function checkEntryChunkFontFaces(): FailureReport[] {
  const sidecarFile = 'fonts.css';
  const entryChunkFile = 'assets/index.css';
  const sidecarPath = path.resolve(distributionDirectory, sidecarFile);
  const entryChunkPath = path.resolve(distributionDirectory, entryChunkFile);

  if (!existsSync(sidecarPath)) {
    return [{ file: sidecarFile, hits: [{ line: 0, column: 0, snippet: 'font sidecar is missing' }] }];
  }
  if (!existsSync(entryChunkPath)) {
    return [{ file: entryChunkFile, hits: [{ line: 0, column: 0, snippet: 'entry-chunk CSS is missing' }] }];
  }

  const expectedCount = countFontFaces(sidecarPath);
  const actualCount = countFontFaces(entryChunkPath);
  if (expectedCount > 0 && actualCount === expectedCount) return [];

  return [
    {
      file: entryChunkFile,
      hits: [
        {
          line: 0,
          column: 0,
          snippet: `expected ${expectedCount} @font-face rules from fonts.css, found ${actualCount}`,
        },
      ],
    },
  ];
}

// --- Run all checks ---------------------------------------------------------

function report(title: string, failures: FailureReport[], hint: string, rootLabel = 'packages/ui/dist'): boolean {
  if (failures.length === 0) {
    console.log(`✔ ${title}`);
    return true;
  }

  const total = failures.reduce((n, f) => n + f.hits.length, 0);
  console.error(`\n✖ Found ${total} issue(s): ${title}\n`);
  for (const { file, hits } of failures) {
    console.error(`  ${rootLabel}/${file}`);
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
      'discard the whole declaration otherwise.',
  ),
  report(
    'Built CSS: Workflow Builder variables use sanctioned namespaces',
    checkVariableNamespaces(files, distributionDirectory),
    'Use `--wb-ds-*` for generated design tokens, `--wb-sdk-*` for SDK internals, ' +
      '`--wb-public-*` for supported overrides, or an unprefixed component-local name.',
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
  report(
    'Built CSS: every non-data url() resolves inside dist',
    checkUrlTargets(files, distributionDirectory),
    'Copy every referenced asset into dist and keep its path relative to the stylesheet.',
  ),
  report(
    'Built CSS: the root entry chunk carries every @font-face rule',
    checkEntryChunkFontFaces(),
    'Append the generated font block to dist/assets/index.css so the root JS barrel carries it.',
  ),
];

for (const directory of process.argv.slice(2)) {
  const targetDistributionDirectory = path.resolve(process.cwd(), directory);
  const targetFiles = globSync('**/*.css', { cwd: targetDistributionDirectory });
  const rootLabel = path.relative(path.resolve(packageDirectory, '../..'), targetDistributionDirectory);
  results.push(
    report(
      `Built CSS (${rootLabel}): every non-data url() resolves inside dist`,
      checkUrlTargets(targetFiles, targetDistributionDirectory),
      'Copy every referenced asset into dist and keep its path relative to the stylesheet.',
      rootLabel,
    ),
    report(
      `Built CSS (${rootLabel}): Workflow Builder variables use sanctioned namespaces`,
      checkVariableNamespaces(targetFiles, targetDistributionDirectory),
      'Use `--wb-ds-*` for generated design tokens, `--wb-sdk-*` for SDK internals, ' +
        '`--wb-public-*` for supported overrides, or an unprefixed component-local name.',
      rootLabel,
    ),
    report(
      `Built CSS (${rootLabel}): SDK public defaults are present inside @layer blocks`,
      checkSdkPublicDefaultLayerCoverage(targetFiles, targetDistributionDirectory),
      'The three SDK-owned `--wb-public-form-*` defaults must ship inside an `@layer` block.',
      rootLabel,
    ),
  );
}

if (results.includes(false)) {
  process.exitCode = 1;
}
