/**
 * Stylelint rule: forbid fallbacks on system design tokens.
 *
 * `var(--wb-…, x)` / `var(--ax-…, x)` silently masks a mistyped token name —
 * the fallback renders and the typo ships. The companion rule
 * `csstools/value-no-unknown-custom-properties` cannot catch that case
 * because a var() with a fallback is valid CSS regardless of the name.
 *
 * Legitimate exceptions use the standard mechanism with a mandatory reason:
 *   /* stylelint-disable-next-line wb/no-system-token-fallbacks -- reason *\/
 */
import valueParser from 'postcss-value-parser';
import stylelint from 'stylelint';

const ruleName = 'wb/no-system-token-fallbacks';

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (name) => `Unexpected fallback on system token "${name}" — fallbacks mask typos`,
});

const meta = {
  url: 'https://github.com/synergycodes/workflowbuilder/blob/main/packages/tokens/README.md',
};

const rule = (primary) => (root, result) => {
  if (!primary) return;
  root.walkDecls((decl) => {
    valueParser(decl.value).walk((node) => {
      if (node.type !== 'function' || node.value !== 'var') return;
      const [first, ...rest] = node.nodes;
      if (!first || !/^--(wb|ax)-/.test(first.value)) return;
      if (rest.some((argument) => argument.type === 'div' && argument.value === ',')) {
        stylelint.utils.report({
          ruleName,
          result,
          node: decl,
          message: messages.rejected(first.value),
        });
      }
    });
  });
};

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

export default stylelint.createPlugin(ruleName, rule);
