import type { AtRule, Plugin, Root, Rule } from 'postcss';

// Moves variable-only `:root` defaults onto `[data-wb-theme]` inside `@layer wb-ui.base`, so sources keep
// writing `:root { … }`. Why: css-layers.md, "Why the defaults stay layered". The rewrite is to go: sources
// should name `[data-wb-theme]` themselves and only the layering stay here (follow-up: css-defaults-in-source).

// The one layer the built CSS uses; `src/styles/layers.css` states its order and the checker verifies they agree.
export const DEFAULTS_LAYER = 'wb-ui.base';

const THEME_SCOPE = '[data-wb-theme]';

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

// Design tokens (primitives, Canvas) must stay on :root: themed tokens resolve against them by inheritance.
function declaresDesignTokens(rule: Rule): boolean {
  return rule.nodes.some((node) => node.type === 'decl' && node.prop.startsWith('--wb-ds-'));
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
            // Grouped or qualified `:root` keeps its selector: rewriting it would drop the
            // qualifier (a dark-only block would apply in light mode).
            if (rule.selector.trim() === ':root' && isVariableOnlyRule(rule) && !declaresDesignTokens(rule)) {
              rule.selector = THEME_SCOPE;
            }

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
