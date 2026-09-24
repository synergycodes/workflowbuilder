---
'@workflowbuilder/ui': major
'@workflowbuilder/sdk': major
---

The design-token surface published as `--ax-*` custom properties is replaced by `--wb-ds-*` properties generated from the Design System 2.0 Figma variables. This is not a prefix swap: primitives are renamed and re-scaled, semantic colours are defined per theme, and the export adds canvas, shadow (effects) and component role sets that had no counterpart before. The 3.0 upgrade guide in the documentation carries the full old-to-new mapping.

Breaking changes:

- Move every override of an `--ax-*` design token to the `--wb-ds-*` property listed for it in the upgrade guide. There are no compatibility aliases, and a token with no listed counterpart has none.
- Expect a repainted palette wherever tokens are used unchanged: the brand accent is `#3969ff`, and the red, green and orange scales carry new values. Warning surfaces shift the most, because the orange scale was rebuilt around `--wb-ds-colors-orange-500` (`#fdac1b`).
- Public component variables move from `--ax-public-*` to `--wb-public-*`, and several families are renamed at the same time; see the separate public-variable and component changes.

New in the export and used by the components: canvas node body and row metrics (`--wb-ds-canvas-node-body-*`, `--wb-ds-canvas-node-row-*`), node focus ring colours and shadow (`--wb-ds-canvas-node-focus-ring-*`, `--wb-ds-shadow-canvas-focus-ring-node-*`), selected list backgrounds (`--wb-ds-ui-bg-selected`, `--wb-ds-ui-bg-selected-hover`), ghost button label roles that hold WCAG AA on every tint (`--wb-ds-components-button-ghost-*-text-default`), and the size steps that button heights and icon sizes now resolve from.
