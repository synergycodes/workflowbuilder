import type { AtRule, Plugin, Root, Rule } from 'postcss';

import { isThemeScopedDefaults, targetsRoot } from './postcss-layer-root-defaults.mjs';

// Scopes every selector to the editor with enough weight to beat host resets; the id `#\#` (id "#") only adds
// weight, `.workflow-builder-root` is what matches. No page uses that id, unlike a word such as `wb`.
// Ladder and skips: css-layers.md, "The prefix ladder".

export type PrefixStrength = 'vendored' | 'ui' | 'sdk';

export const PREFIX: Record<PrefixStrength, string> = {
  vendored: ':where(.workflow-builder-root) ',
  ui: String.raw`:is(#\#, .workflow-builder-root) `,
  sdk: String.raw`:is(#\#, .workflow-builder-root).workflow-builder-root `,
};

// Whitespace-free: the UI dist the SDK build re-reads is minified.
const ALREADY_PREFIXED = Object.values(PREFIX).map((prefix) => prefix.replaceAll(/\s/g, ''));

// The bare root class followed by a descendant or child combinator: the scoped resets (`.workflow-builder-root
// button`). A sibling combinator would reach the host's elements next to the editor, so it does not count.
// Shared with the built-CSS checker so the plugin's exception and the checker's never drift apart.
export function startsWithBareRoot(selector: string): boolean {
  return /^\.workflow-builder-root(?:\s+(?![+~])|\s*>\s*)\S/.test(selector.trim());
}

// The editor box or the popup container at the start of a selector, including the bare root with a state or a
// sibling: a descendant prefix never matches them, so the rule would be dead or reach the box's siblings.
export function startsWithBoxClass(selector: string): boolean {
  return (
    /^\.(?:workflow-builder-root(?:-shell)?|wb-portal)(?![\w-])/.test(selector.trim()) && !startsWithBareRoot(selector)
  );
}

// Allowlist, as in postcss-box-sizing: @keyframes, @font-face, @layer and unknown at-rules are left alone.
const STYLING_CONTEXTS = new Set(['media', 'supports', 'container']);

export type ScopePrefixOptions = {
  strength: PrefixStrength;
  vendoredFiles?: RegExp;
  // Files outside it pass through untouched (an app build also feeds the plugin its own CSS).
  include?: RegExp;
};

// Base styles (typography roles, the base button) write `:where()` in the source, so they keep only the
// prefix's weight and every component rule overrides them.
function prefixSelector(selector: string, prefix: string): string {
  const trimmed = selector.trim();
  const compact = trimmed.replaceAll(/\s/g, '');

  if (ALREADY_PREFIXED.some((done) => compact.startsWith(done))) return selector;
  // Scoped resets under the bare root class keep one class of weight on purpose.
  if (startsWithBareRoot(trimmed)) return selector;

  // The theme attribute sits on the box, so the scope class is glued on, not a descendant.
  // Bare variable-only blocks never get here: prefixRule leaves them as defaults.
  if (trimmed.startsWith('[data-wb-theme')) return prefix.trimEnd() + trimmed;

  return prefix + trimmed;
}

function prefixRule(rule: Rule, { strength, vendoredFiles }: ScopePrefixOptions): void {
  if (targetsRoot(rule) || isThemeScopedDefaults(rule)) return;

  const boxSelector = rule.selectors.find(startsWithBoxClass);
  if (boxSelector) {
    throw rule.error(
      `\`${boxSelector.trim()}\` names the editor box, which a descendant prefix never matches. Write the rule with the glued prefix (\`:is(#\\#, .workflow-builder-root).<class>\`) or as a scoped reset (\`.workflow-builder-root button\`).`,
    );
  }

  const file = rule.source?.input.file ?? '';
  const isVendored = vendoredFiles?.test(file) ?? false;
  const prefix = PREFIX[isVendored ? 'vendored' : strength];
  const selectors = rule.selectors.map((selector) => prefixSelector(selector, prefix));

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
          if (options.include && !options.include.test(root.source?.input.file ?? '')) return;
          prefixRules(root, options);
        },
      };
    },
  };
}

scopePrefixPlugin.postcss = true;
