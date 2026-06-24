import type { Plugin } from 'postcss';

/**
 * PostCSS plugin that adds `box-sizing: border-box` to every rule
 * in CSS Module files (*.module.css). This ensures all library
 * components use border-box sizing without leaking styles to users.
 */
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
