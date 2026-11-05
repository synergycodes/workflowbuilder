---
'@workflowbuilder/ui': minor
---

- New `NodePanel.Overlay` slot: a layer over the whole node, with `isVisible` like `NodePanel.Content`. The node container is now `position: relative`, so absolutely positioned elements inside it are placed against the node and paint above earlier positioned siblings of `NodePanel.Root` that have no `z-index`.
- New `--wb-public-node-box-shadow-selected-with-run-status` (no ring by default) sets the focus ring of a selected node whose overlay shows a run status; set it to `var(--wb-public-node-box-shadow-selected)` to keep the ring.
