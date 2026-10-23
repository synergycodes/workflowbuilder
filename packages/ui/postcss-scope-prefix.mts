import type { AtRule, Plugin, Root, Rule } from 'postcss';

import { isThemeScopedDefaults, targetsRoot } from './postcss-layer-root-defaults.mjs';

/**
 * PostCSS plugin that scopes every selector to the editor and gives it enough
 * weight to beat a host page's unlayered resets (Bootstrap reboot, `.app button`).
 *
 * `:is(#wb, …)` takes the specificity of its heaviest argument, so the made-up
 * `#wb` adds id weight while only `.workflow-builder-root` has to match.
 * Rules still inside `@layer` are the deliberately weak defaults and stay as they are.
 */

export type PrefixStrength = 'vendored' | 'ui' | 'sdk';

export const PREFIX: Record<PrefixStrength, string> = {
  vendored: ':where(.workflow-builder-root) ',
  ui: ':is(#wb, .workflow-builder-root) ',
  sdk: ':is(#wb, .workflow-builder-root).workflow-builder-root ',
};

// Whitespace-free: the UI dist the SDK build re-reads is minified.
const ALREADY_PREFIXED = Object.values(PREFIX).map((prefix) => prefix.replaceAll(/\s/g, ''));

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

  if (trimmed.startsWith('[data-wb-theme')) {
    const isBare = trimmed.indexOf(']') === trimmed.length - 1;
    // The theme attribute sits on the box, so the scope class is glued on, not a descendant.
    return isBare ? selector : prefix.trimEnd() + trimmed;
  }

  return prefix + (isBase ? `:where(${trimmed})` : trimmed);
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
