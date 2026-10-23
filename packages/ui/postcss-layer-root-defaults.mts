import type { Plugin, Rule } from 'postcss';

/**
 * PostCSS plugin that moves top-level variable defaults onto `[data-wb-theme]`
 * and wraps them in `@layer ui.base`.
 *
 * A custom property whose value contains `var()` is resolved on the element
 * that declares it, so defaults must sit on the same element as the themed
 * tokens they reference: `[data-wb-theme]`, which the SDK sets on its own root
 * and portal container. A variable-only `:root { … }` block is rewritten to
 * that selector; `[data-wb-theme…] { … }` written directly is kept as is.
 *
 * Layered declarations lose to unlayered CSS regardless of source order, so a
 * consumer's `.workflow-builder-root { --wb-public-…: … }` override always
 * beats the shipped default - even when a lazily loaded component stylesheet
 * arrives after the override. Unlayered defaults would win or lose by load order.
 *
 * Applied at build time (like the @layer order stamp) so sources keep the
 * plain `:root { … }` authoring convention.
 */

const THEME_SCOPE = '[data-wb-theme]';

// Bare attribute only: `[data-wb-theme='dark'] .x` or `.panel` is a component rule, not a default block.
const THEME_SCOPE_SELECTOR = /^\[data-wb-theme(?:=(?:'[^']*'|"[^"]*"|[\w-]+))?\]$/;

export function isVariableOnlyRule(rule: Rule): boolean {
  const declarations = rule.nodes.filter((node) => node.type !== 'comment');
  return declarations.length > 0 && declarations.every((node) => node.type === 'decl' && node.prop.startsWith('--'));
}

// Also grouped (`:root, .fallback`) or qualified (`:root[data-theme='dark']`).
function targetsRoot(rule: Rule): boolean {
  return rule.selectors.some((selector) => selector.trim().startsWith(':root'));
}

// Design tokens (primitives, Canvas) must stay on :root: themed tokens resolve against them by inheritance.
function declaresDesignTokens(rule: Rule): boolean {
  return rule.nodes.some((node) => node.type === 'decl' && node.prop.startsWith('--wb-ds-'));
}

export function isThemeScopedDefaults(rule: Rule): boolean {
  return rule.selectors.every((selector) => THEME_SCOPE_SELECTOR.test(selector.trim())) && isVariableOnlyRule(rule);
}

export function layerRootDefaultsPlugin(): Plugin {
  return {
    postcssPlugin: 'postcss-layer-root-defaults',
    prepare() {
      return {
        OnceExit(root, { atRule }) {
          const topLevelDefaults = root.nodes.filter(
            (node): node is Rule => node.type === 'rule' && (targetsRoot(node) || isThemeScopedDefaults(node)),
          );

          for (const rule of topLevelDefaults) {
            // Grouped or qualified `:root` keeps its selector: rewriting it would drop the
            // qualifier (a dark-only block would apply in light mode).
            if (rule.selector.trim() === ':root' && isVariableOnlyRule(rule) && !declaresDesignTokens(rule)) {
              rule.selector = THEME_SCOPE;
            }

            const layer = atRule({ name: 'layer', params: 'ui.base', source: rule.source });
            rule.replaceWith(layer);
            layer.append(rule);
          }
        },
      };
    },
  };
}

layerRootDefaultsPlugin.postcss = true;
