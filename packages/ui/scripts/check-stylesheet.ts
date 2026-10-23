import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import postcss, { AtRule, type ChildNode, type Declaration, type Node, type Root, type Rule } from 'postcss';

import { isVariableOnlyRule } from '../postcss-layer-root-defaults.mjs';
import { PREFIX } from '../postcss-scope-prefix.mjs';

const packageDirectory = path.resolve(import.meta.dirname, '..');
const repositoryDirectory = path.resolve(packageDirectory, '../..');
const pitfalls = 'packages/ui/built-css-pitfalls.md';
const order = postcss
  .parse(readFileSync(path.join(packageDirectory, 'src/styles/layers.css'), 'utf8'))
  .nodes.find((node): node is AtRule => node.type === 'atrule' && node.name === 'layer' && !node.nodes);

if (!order) throw new Error('src/styles/layers.css must contain a layer-order statement');

const layerNames = order.params.split(',').map((name) => name.trim());
const knownLayers = new Set(layerNames);
const urlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;
const sanctionedPrefixes = ['--wb-ds-', '--wb-sdk-', '--wb-public-'];
// Whitespace-free: built CSS is minified.
const scopePrefixes = Object.values(PREFIX).map((prefix) => prefix.replaceAll(/\s/g, ''));
const checkedInside = new Set(['media', 'supports', 'container']);
const standalone = new Set(['keyframes', 'font-face', 'import']);

export type CheckOptions = {
  // Absolute stylesheet path: reported in messages, and url() targets resolve against it.
  from: string;
  // The dist directory every url() target must stay inside.
  directory: string;
  // Only the UI package declares the public defaults consumers override.
  ownsPublicDefaults: boolean;
};

type Report = (node: Node | undefined, message: string) => void;

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

function existsWithExactCase(root: string, relativeTarget: string): boolean {
  let current = root;
  return relativeTarget.split(path.sep).every((segment) => {
    try {
      if (!readdirSync(current).includes(segment)) return false;
    } catch {
      return false;
    }
    current = path.join(current, segment);
    return true;
  });
}

function isPublicDefault(declaration: Declaration): boolean {
  const rule = declaration.parent;
  if (
    rule?.type !== 'rule' ||
    !rule.selectors.every((selector) =>
      /^\[data-wb-theme(?:='(?:light|dark)')?\](?:\[[^\]]+\]|[.#][\w-]+)*$/.test(selector.trim()),
    )
  )
    return false;

  let ancestor: Node | undefined = rule.parent;
  while (ancestor && !(ancestor instanceof AtRule && ancestor.name === 'layer')) ancestor = ancestor.parent;
  return ancestor instanceof AtRule && ancestor.params.trim() === 'ui.base';
}

// Editor-box rules (shell geometry, overlay backdrop) name the scope themselves.
function isScoped(selector: string): boolean {
  const compact = selector.replaceAll(/\s/g, '');
  return scopePrefixes.some((prefix) => compact.startsWith(prefix)) || compact.startsWith('.workflow-builder-root');
}

function isDefaultsBlock(rule: Rule): boolean {
  return (
    isVariableOnlyRule(rule) && rule.selectors.every((selector) => /^(?::root|\[data-wb-theme)/.test(selector.trim()))
  );
}

function checkUnlayered(container: Root | AtRule, report: Report): void {
  for (const node of container.nodes ?? []) {
    if (node.type === 'rule') {
      if (!isDefaultsBlock(node) && !node.selectors.every(isScoped)) report(node, 'Unprefixed built CSS');
    } else if (node.type === 'atrule') {
      if (node.name === 'layer') {
        if (node.nodes) checkLayerContents(node, report);
      } else if (checkedInside.has(node.name)) {
        checkUnlayered(node, report);
      } else if (!standalone.has(node.name)) {
        report(node, 'Unprefixed built CSS');
      }
    }
  }
}

// The layer exists so consumer overrides beat the shipped defaults; a painting rule in it loses to host resets.
function checkLayerContents(container: AtRule, report: Report): void {
  for (const node of container.nodes ?? []) {
    if (node.type === 'rule' && !isVariableOnlyRule(node)) {
      report(node, 'Painting rule inside @layer');
    } else if (node.type === 'atrule' && node.name !== 'font-face') {
      if (checkedInside.has(node.name)) checkLayerContents(node, report);
      else report(node, 'Painting rule inside @layer');
    }
  }
}

export function checkStylesheet(css: string, { from, directory, ownsPublicDefaults }: CheckOptions): string[] {
  const file = path.relative(repositoryDirectory, from);
  const problems: string[] = [];
  const report: Report = (node, message) => {
    problems.push(`${file}:${node?.source?.start?.line ?? 1} ${message}. See ${pitfalls}.`);
  };
  const root = postcss.parse(css, { from });

  if (!isOrderStatement(root.first)) report(root.first, 'Missing leading layer order');
  checkUnlayered(root, report);

  root.walkAtRules('layer', (atRule) => {
    if (atRule.params.split(',').some((name) => !knownLayers.has(name.trim()))) report(atRule, 'Unknown layer name');
  });
  root.walkAtRules('import', (atRule) => report(atRule, 'Built CSS import'));

  root.walkDecls((declaration) => {
    if (/var\((?!\s*--)/.test(declaration.value)) report(declaration, 'Malformed var() argument');
    const invalidNamespace =
      declaration.prop.startsWith('--ax-') ||
      (declaration.prop.startsWith('--wb-') &&
        !sanctionedPrefixes.some((prefix) => declaration.prop.startsWith(prefix)));
    if (invalidNamespace) report(declaration, 'Unsanctioned variable namespace');
    // Themed tokens sit on [data-wb-theme='light'|'dark']; the bare attribute is the defaults plugin's
    // rewrite target, so a design token there means primitives or Canvas tokens left :root.
    const parentSelector = declaration.parent?.type === 'rule' ? declaration.parent.selector.trim() : '';
    if (declaration.prop.startsWith('--wb-ds-') && parentSelector === '[data-wb-theme]') {
      report(declaration, 'Design token moved off :root');
    }
    // The build plugin skips hand-layered and raw-concatenated blocks, so a default can still reach :root.
    if (/^--wb-(?:public|sdk)-/.test(declaration.prop) && parentSelector.startsWith(':root')) {
      report(declaration, 'Default on :root cannot resolve themed tokens');
    }
    // A consumer bundle setting a public variable on its own component subtree is a scoped override, not a default.
    if (ownsPublicDefaults && declaration.prop.startsWith('--wb-public-') && !isPublicDefault(declaration)) {
      report(declaration, 'Mis-scoped public variable default');
    }

    for (const match of declaration.value.matchAll(urlPattern)) {
      const reference = (match[1] ?? match[2] ?? match[3]).trim();
      if (/^(?:data:|[a-z][a-z\d+.-]*:|\/)/i.test(reference)) continue;

      let target: string;
      try {
        target = path.resolve(path.dirname(from), decodeURIComponent(reference.split(/[?#]/, 1)[0]));
      } catch {
        report(declaration, 'Missing built URL target');
        continue;
      }
      const relativeTarget = path.relative(directory, target);
      const outside =
        relativeTarget === '..' || relativeTarget.startsWith(`..${path.sep}`) || path.isAbsolute(relativeTarget);
      if (outside || !existsWithExactCase(directory, relativeTarget) || !statSync(target).isFile())
        report(declaration, 'Missing built URL target');
    }
  });

  return problems;
}
