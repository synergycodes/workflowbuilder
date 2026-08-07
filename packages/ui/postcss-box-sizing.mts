import type { Plugin, Rule } from 'postcss';

/**
 * PostCSS plugin that adds `box-sizing: border-box` to every styling rule
 * in CSS Module files (*.module.css). This ensures all library
 * components use border-box sizing without leaking styles to users.
 */

// Inject only inside contexts we KNOW are plain styling (an allowlist, not a
// @keyframes blocklist): CSS keeps adding new at-rules, and for an unknown one
// a missed box-sizing is easy to spot, while a wrongly injected one
// (e.g. inside @keyframes) silently becomes animated.
const STYLING_CONTEXTS = new Set(['media', 'supports', 'container', 'layer']);

const vendorless = (atRuleName: string): string => atRuleName.replace(/^-\w+-/, '');

function isPlainStylingContext(rule: Rule): boolean {
  for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent) {
    if (parent.type === 'rule') continue;
    if (parent.type === 'atrule' && STYLING_CONTEXTS.has(vendorless(parent.name))) continue;
    return false;
  }

  return true;
}

export function boxSizingPlugin(): Plugin {
  return {
    postcssPlugin: 'postcss-box-sizing',
    prepare() {
      return {
        OnceExit(root) {
          const file = root.source?.input?.file ?? '';
          if (!file.endsWith('.module.css')) return;

          root.walkRules((rule) => {
            if (rule.selector === ':root') return;
            if (!isPlainStylingContext(rule)) return;

            const hasDeclarations = rule.nodes?.some(
              (node) => node.type === 'decl',
            );

            // Skip rules that only contain nested rules (no declarations).
            // Adding box-sizing to such container rules would leak to unintended elements
            if (!hasDeclarations) return;

            const hasBoxSizing = rule.nodes?.some(
              (node) => node.type === 'decl' && node.prop === 'box-sizing',
            );

            if (!hasBoxSizing) {
              rule.prepend({ prop: 'box-sizing', value: 'border-box' });
            }
          });
        },
      };
    },
  };
}

boxSizingPlugin.postcss = true;
