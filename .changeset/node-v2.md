---
'@workflowbuilder/sdk': patch
---

Built-in node templates follow DS Node v2: 258px wide nodes with 30px body rows, and a collapsed node measures as header-only.

Breaking changes:

- `--wb-public-node-padding` now pads only the node body, not the header, and `--wb-public-node-gap` sets only the gap between body children. Set the header spacing with `--wb-public-node-header-padding-block`, `--wb-public-node-header-padding-inline` and `--wb-public-node-header-gap`.
- Nodes are 258px wide instead of 241px. Palette entries keep 241px: the palette sets its own `--wb-public-node-width`, so a value on `:root` no longer resizes them.
- The node stroke is an inset `outline` instead of a `border`, so the node keeps its size. A rule that set `border` or `border-color` on the node no longer changes the stroke; set `outline-color` instead.
