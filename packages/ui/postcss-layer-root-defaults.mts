import type { Plugin, Rule } from 'postcss';

/**
 * PostCSS plugin that wraps top-level `:root` blocks (variable defaults) in
 * `@layer ui.base`.
 *
 * Layered declarations lose to unlayered CSS regardless of source order, so a
 * consumer's `:root { --wb-public-…: … }` override always beats the shipped
 * default - even when a lazily loaded component stylesheet arrives after the
 * override. Unlayered defaults would instead win or lose by load order.
 *
 * Applied at build time (like the @layer order stamp) so sources keep the
 * plain `:root { … }` authoring convention.
 */

// Also grouped (`:root, .fallback`) or qualified (`:root[data-theme='dark']`).
function targetsRoot(rule: Rule): boolean {
  return rule.selectors.some((selector) => selector.trim().startsWith(':root'));
}

export function layerRootDefaultsPlugin(): Plugin {
  return {
    postcssPlugin: 'postcss-layer-root-defaults',
    prepare() {
      return {
        OnceExit(root, { atRule }) {
          const topLevelRootRules = root.nodes.filter(
            (node): node is Rule => node.type === 'rule' && targetsRoot(node),
          );

          for (const rule of topLevelRootRules) {
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
