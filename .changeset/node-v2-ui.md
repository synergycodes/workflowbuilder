---
'@workflowbuilder/ui': major
---

Canvas nodes follow DS Node v2 (258px wide, inset stroke, borderless icon tile) and a new `BadgeLabel` component is exported. The node width is `16.125rem`, so it now scales with the root font size. The new `--wb-public-node-background-color-selected` sets the selected node background.

Breaking changes:

- `--wb-public-node-padding` and `--wb-public-node-gap` now set only the node body padding and the gap between body children. The header no longer follows them: set its padding and gap with the new `--wb-public-node-header-padding-block`, `--wb-public-node-header-padding-inline` and `--wb-public-node-header-gap`, which also keep the header ports centred.
- The node stroke is an inset `outline` instead of a `border`, so the node keeps its size. A rule that set `border` or `border-color` on the node no longer changes the stroke; set `outline-color` instead. `--wb-public-node-box-shadow-selected` holds only the focus ring and accepts `none`.
