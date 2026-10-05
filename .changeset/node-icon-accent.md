---
'@workflowbuilder/sdk': minor
---

Node definitions take an optional `accent` that colors the node's icon on the canvas and in the palette: `'blue' | 'green' | 'orange' | 'violet' | 'gray' | 'violet-gradient'`, or a custom name backed by `--wb-public-node-icon-*-<name>` variables. It is read by node type and never saved into the diagram; `WorkflowNodeTemplateProps` gains `accent`, `NodeIconAccent` is exported, and node definitions resolve as soon as `WorkflowBuilder.Root` mounts, so a layout without a Palette also shows node accents and the node Properties form.
