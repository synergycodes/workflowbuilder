import type { AtRule, Plugin, Root, Rule } from 'postcss';

import { isThemeScopedDefaults, targetsRoot } from './postcss-layer-root-defaults.mjs';

// Scopes every selector to the editor with enough weight to beat host resets; the made-up `#wb` only adds
// weight, `.workflow-builder-root` is what matches. Ladder and skips: css-layers.md, "The prefix ladder".

export type PrefixStrength = 'vendored' | 'ui' | 'sdk';

export const PREFIX: Record<PrefixStrength, string> = {
  vendored: ':where(.workflow-builder-root) ',
  ui: ':is(#wb, .workflow-builder-root) ',
  sdk: ':is(#wb, .workflow-builder-root).workflow-builder-root ',
};

// Whitespace-free: the UI dist the SDK build re-reads is minified.
const ALREADY_PREFIXED = Object.values(PREFIX).map((prefix) => prefix.replaceAll(/\s/g, ''));

// A pseudo-element and any state after it (`::after:hover`) are invalid inside :where(), which would drop
// the rule; includes the legacy single-colon forms.
const PSEUDO_ELEMENT_TAIL = /(?:::[\w-]+(?:\([^)]*\))?|:(?:before|after|first-line|first-letter)(?![\w-])).*$/i;

// Allowlist, as in postcss-box-sizing: @keyframes, @font-face, @layer and unknown at-rules are left alone.
const STYLING_CONTEXTS = new Set(['media', 'supports', 'container']);

export type ScopePrefixOptions = {
  strength: PrefixStrength;
  vendoredFiles?: RegExp;
  // Base styles every component rule must override: the selector is wrapped in `:where()`.
  baseFiles?: RegExp;
};

function prefixSelector(selector: string, prefix: string, isBase: boolean): string {
  const trimmed = selector.trim();
  const compact = trimmed.replaceAll(/\s/g, '');

  if (ALREADY_PREFIXED.some((done) => compact.startsWith(done))) return selector;
  // The editor box itself (shell geometry, overlay backdrop): a descendant prefix would never match it.
  if (trimmed.startsWith('.workflow-builder-root') || trimmed.startsWith(':root')) return selector;

  // The theme attribute sits on the box, so the scope class is glued on, not a descendant.
  // Bare variable-only blocks never get here: prefixRule leaves them as defaults.
  if (trimmed.startsWith('[data-wb-theme')) return prefix.trimEnd() + trimmed;

  if (!isBase) return prefix + trimmed;
  const pseudoElement = PSEUDO_ELEMENT_TAIL.exec(trimmed)?.[0] ?? '';
  return `${prefix}:where(${trimmed.slice(0, trimmed.length - pseudoElement.length)})${pseudoElement}`;
}

function prefixRule(rule: Rule, { strength, vendoredFiles, baseFiles }: ScopePrefixOptions): void {
  if (targetsRoot(rule) || isThemeScopedDefaults(rule)) return;

  const file = rule.source?.input.file ?? '';
  const isVendored = vendoredFiles?.test(file) ?? false;
  const isBase = baseFiles?.test(file) ?? false;
  const prefix = PREFIX[isVendored ? 'vendored' : strength];
  const selectors = rule.selectors.map((selector) => prefixSelector(selector, prefix, isBase));

  if (selectors.some((selector, index) => selector !== rule.selectors[index])) {
    rule.selectors = selectors;
  }
}

function prefixRules(container: Root | AtRule, options: ScopePrefixOptions): void {
  for (const node of container.nodes ?? []) {
    if (node.type === 'rule') prefixRule(node, options);
    else if (node.type === 'atrule' && STYLING_CONTEXTS.has(node.name)) prefixRules(node, options);
  }
}

export function scopePrefixPlugin(options: ScopePrefixOptions): Plugin {
  return {
    postcssPlugin: 'postcss-scope-prefix',
    prepare() {
      return {
        OnceExit(root) {
          prefixRules(root, options);
        },
      };
    },
  };
}

scopePrefixPlugin.postcss = true;
