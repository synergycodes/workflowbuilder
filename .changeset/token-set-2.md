---
'@workflowbuilder/ui': major
'@workflowbuilder/sdk': major
---

The design-token theming surface exposed as `--ax-*` custom properties is removed from `tokens.css` and replaced by generated `--wb-*` properties from the refreshed Figma variables. Consumers who overrode `--ax-*` design tokens must move those overrides to the corresponding `--wb-*` properties; the `--ax-public-*` per-component override surface remains unchanged. The new set includes renamed and re-scaled primitives, semantic tokens per theme, new canvas and shadow (effects) sets, and the refreshed palette (brand `#3969FF`, updated reds/greens/oranges).
