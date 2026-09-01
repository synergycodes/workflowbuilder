/**
 * Stylelint rule: validate fallbacks on system design tokens.
 *
 * A fallback on `--wb-ds-*`, `--wb-sdk-*`, or `--wb-public-*` silently masks a mistyped token name -
 * the fallback renders and the typo ships.
 *
 * The public font tokens require fallbacks so standalone component CSS remains
 * usable without the stylesheet that defines their defaults. Legitimate
 * exceptions for other tokens use the standard mechanism with a mandatory reason:
 *   /* stylelint-disable-next-line wb/no-system-token-fallbacks -- reason *\/
 */
import valueParser from 'postcss-value-parser';
import stylelint from 'stylelint';

const ruleName = 'wb/no-system-token-fallbacks';
const tokensWithRequiredFallbacks = new Set(['--wb-public-font-family', '--wb-public-font-family-mono']);

const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (name) => `Unexpected fallback on system token "${name}" — fallbacks mask typos`,
  required: (name) => `Expected fallback on public font token "${name}"`,
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
      if (!first || !/^--wb-(ds|sdk|public)-/.test(first.value)) return;

      const separatorIndex = rest.findIndex((argument) => argument.type === 'div' && argument.value === ',');
      const hasFallback =
        separatorIndex !== -1 &&
        rest.slice(separatorIndex + 1).some((argument) => argument.type !== 'comment' && argument.value.trim());

      if (tokensWithRequiredFallbacks.has(first.value)) {
        if (!hasFallback) {
          stylelint.utils.report({
            ruleName,
            result,
            node: decl,
            message: messages.required(first.value),
          });
        }
        return;
      }

      if (separatorIndex !== -1) {
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
