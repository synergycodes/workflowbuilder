import type { AtRule, Plugin, Root, Rule } from 'postcss';

// Wraps variable defaults (`:root` tokens, bare `[data-wb-theme]` blocks) in `@layer wb-ui.base`, so sources
// stay unlayered and a consumer's unlayered override still wins. Why: css-layers.md, "Why the defaults stay layered".

// The one layer the built CSS uses; `src/styles/layers.css` states its order and the checker verifies they agree.
export const DEFAULTS_LAYER = 'wb-ui.base';

// A defaults block inside one of these is layered in place; an unlayered one would tie with a consumer override.
const CONDITIONAL_CONTEXTS = new Set(['media', 'supports', 'container']);

// Bare attribute only: `[data-wb-theme='dark'] .x` or `.panel` is a component rule, not a default block.
const THEME_SCOPE_SELECTOR = /^\[data-wb-theme(?:=(?:'[^']*'|"[^"]*"|[\w-]+))?\]$/;

export function isVariableOnlyRule(rule: Rule): boolean {
  const declarations = rule.nodes.filter((node) => node.type !== 'comment');
  return declarations.length > 0 && declarations.every((node) => node.type === 'decl' && node.prop.startsWith('--'));
}

// Also grouped (`:root, .fallback`) or qualified (`:root[data-theme='dark']`).
export function targetsRoot(rule: Rule): boolean {
  return rule.selectors.some((selector) => selector.trim().startsWith(':root'));
}

export function isThemeScopedDefaults(rule: Rule): boolean {
  return rule.selectors.every((selector) => THEME_SCOPE_SELECTOR.test(selector.trim())) && isVariableOnlyRule(rule);
}

function collectDefaults(container: Root | AtRule, into: Rule[]): Rule[] {
  for (const node of container.nodes ?? []) {
    if (node.type === 'rule' && (targetsRoot(node) || isThemeScopedDefaults(node))) into.push(node);
    else if (node.type === 'atrule' && CONDITIONAL_CONTEXTS.has(node.name)) collectDefaults(node, into);
  }
  return into;
}

export type LayerRootDefaultsOptions = {
  // Files outside it pass through untouched (an app build also feeds the plugin its own CSS).
  include?: RegExp;
};

export function layerRootDefaultsPlugin({ include }: LayerRootDefaultsOptions = {}): Plugin {
  return {
    postcssPlugin: 'postcss-layer-root-defaults',
    prepare() {
      return {
        OnceExit(root, { atRule }) {
          if (include && !include.test(root.source?.input.file ?? '')) return;

          for (const rule of collectDefaults(root, [])) {
            const layer = atRule({ name: 'layer', params: DEFAULTS_LAYER, source: rule.source });
            rule.replaceWith(layer);
            layer.append(rule);
          }
        },
      };
    },
  };
}

layerRootDefaultsPlugin.postcss = true;
