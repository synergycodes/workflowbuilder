---
'@workflowbuilder/ui': major
---

Canvas nodes follow DS Node v2 (258px wide, inset stroke, borderless icon tile) and a new `BadgeLabel` component is exported. The node width is `16.125rem`, so it now scales with the root font size. The new `--wb-public-node-background-color-selected` sets the selected node background.

Breaking changes:

- `--wb-public-node-padding` and `--wb-public-node-gap` now set only the node body padding and the gap between body children. The header no longer follows them: set its padding with `--wb-ds-canvas-node-head-v-pad` and `--wb-ds-canvas-node-head-h-pad`, and its gap with `--wb-ds-canvas-node-head-item-gap`.
- The node stroke is an inset `outline`, not a `box-shadow`. A rule that set `box-shadow` on the node to draw the stroke now draws only a shadow; set `outline-color` instead. `--wb-public-node-box-shadow-selected` holds only the focus ring and accepts `none`.
