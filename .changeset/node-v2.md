---
'@workflowbuilder/sdk': patch
---

Built-in node templates follow DS Node v2: 258px wide nodes with 30px body rows, and a collapsed node measures as header-only.

Breaking changes:

- `--wb-public-node-padding` now pads only the node body, not the header, and `--wb-public-node-gap` sets only the gap between body children. Set the header spacing with `--wb-ds-canvas-node-head-v-pad`, `--wb-ds-canvas-node-head-h-pad` and `--wb-ds-canvas-node-head-item-gap`.
- Nodes are 258px wide instead of 241px. Palette entries keep 241px.
