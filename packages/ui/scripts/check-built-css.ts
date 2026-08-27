import { existsSync, globSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import postcss, { AtRule, type ChildNode, type Declaration, type Node } from 'postcss';

const packageDirectory = path.resolve(import.meta.dirname, '..');
const repositoryDirectory = path.resolve(packageDirectory, '../..');
const pitfalls = 'packages/ui/built-css-pitfalls.md';
const order = postcss
  .parse(readFileSync(path.join(packageDirectory, 'src/styles/layers.css'), 'utf8'))
  .nodes.find((node): node is AtRule => node.type === 'atrule' && node.name === 'layer' && !node.nodes);

if (!order) throw new Error('src/styles/layers.css must contain a layer-order statement');

const layerNames = order.params.split(',').map((name) => name.trim());
const knownLayers = new Set(layerNames);
const problems: string[] = [];
const urlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;
const sanctionedPrefixes = ['--wb-ds-', '--wb-sdk-', '--wb-public-'];

function isOrderStatement(node: ChildNode | undefined): boolean {
  return (
    node?.type === 'atrule' &&
    node.name === 'layer' &&
    !node.nodes &&
    node.params
      .split(',')
      .map((name) => name.trim())
      .join(',') === layerNames.join(',')
  );
}

function add(file: string, node: Node | undefined, message: string): void {
  problems.push(`${file}:${node?.source?.start?.line ?? 1} ${message}. See ${pitfalls}.`);
}

function isPublicDefault(declaration: Declaration): boolean {
  const rule = declaration.parent;
  if (
    rule?.type !== 'rule' ||
    !rule.selectors.every((selector) => /^(?::root|html)(?:\[[^\]]+\]|[.#][\w-]+)*$/.test(selector.trim()))
  )
    return false;

  let ancestor: Node | undefined = rule.parent;
  while (ancestor && !(ancestor instanceof AtRule && ancestor.name === 'layer')) ancestor = ancestor.parent;
  return ancestor instanceof AtRule && ancestor.params.trim() === 'ui.base';
}

// The layer contract belongs to this package: it stamps the order statement and wraps
// every rule. Consumer bundles (the SDK) ship their own unlayered component CSS, so they
// are only held to the checks that are theirs to satisfy.
const directories = [
  { path: path.join(packageDirectory, 'dist'), ownsLayerContract: true },
  ...process.argv.slice(2).map((item) => ({ path: path.resolve(item), ownsLayerContract: false })),
];

for (const { path: directory, ownsLayerContract } of directories) {
  for (const relativeFile of globSync('**/*.css', { cwd: directory })) {
    const absoluteFile = path.join(directory, relativeFile);
    const file = path.relative(repositoryDirectory, absoluteFile);
    const root = postcss.parse(readFileSync(absoluteFile, 'utf8'), { from: absoluteFile });

    if (ownsLayerContract) {
      if (!isOrderStatement(root.first)) add(file, root.first, 'Missing leading layer order');

      for (const node of root.nodes) {
        // A statement-form @layer only declares names. The leading-order check above
        // guarantees the canonical order comes first, so a later declaration cannot
        // reorder anything; composes-only stylesheets legitimately produce one.
        const allowedLayer = node.type === 'atrule' && node.name === 'layer';
        if ((node.type === 'rule' || node.type === 'atrule') && !allowedLayer) add(file, node, 'Unlayered built CSS');
      }

      root.walkAtRules('layer', (atRule) => {
        if (atRule.params.split(',').some((name) => !knownLayers.has(name.trim())))
          add(file, atRule, 'Unknown layer name');
      });
    }
    root.walkAtRules('import', (atRule) => add(file, atRule, 'Built CSS import'));

    root.walkDecls((declaration) => {
      if (/var\((?!\s*--)/.test(declaration.value)) add(file, declaration, 'Malformed var() argument');
      const invalidNamespace =
        declaration.prop.startsWith('--ax-') ||
        (declaration.prop.startsWith('--wb-') &&
          !sanctionedPrefixes.some((prefix) => declaration.prop.startsWith(prefix)));
      if (invalidNamespace) add(file, declaration, 'Unsanctioned variable namespace');
      // Only this package declares the public defaults consumers override, so only here does
      // "must sit on :root inside ui.base" hold. A consumer bundle setting a public variable on
      // its own component subtree is a scoped override, not a default.
      if (ownsLayerContract && declaration.prop.startsWith('--wb-public-') && !isPublicDefault(declaration)) {
        add(file, declaration, 'Mis-scoped public variable default');
      }

      for (const match of declaration.value.matchAll(urlPattern)) {
        const reference = (match[1] ?? match[2] ?? match[3]).trim();
        if (/^(?:data:|[a-z][a-z\d+.-]*:|\/)/i.test(reference)) continue;

        let target: string;
        try {
          target = path.resolve(path.dirname(absoluteFile), decodeURIComponent(reference.split(/[?#]/, 1)[0]));
        } catch {
          add(file, declaration, 'Missing built URL target');
          continue;
        }
        const relativeTarget = path.relative(directory, target);
        const outside =
          relativeTarget === '..' || relativeTarget.startsWith(`..${path.sep}`) || path.isAbsolute(relativeTarget);
        if (outside || !existsSync(target) || !statSync(target).isFile())
          add(file, declaration, 'Missing built URL target');
      }
    });
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
}
