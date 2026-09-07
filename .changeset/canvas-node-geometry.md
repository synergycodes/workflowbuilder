---
'@workflowbuilder/ui': patch
---

Canvas nodes follow the Design System 2.0 geometry: the default shell width is the designed 241px (`--wb-public-node-width: 241px`, a canvas dimension that no longer scales with the root font size), and the shell padding and vertical gap bind to the node head roles `--wb-ds-canvas-node-head-h-pad` and `--wb-ds-canvas-node-head-gap` (8px each) instead of the generic spacing step. Overrides of the public node variables keep working unchanged.
