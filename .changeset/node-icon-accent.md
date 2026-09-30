---
'@workflowbuilder/sdk': minor
---

Node definitions take an optional `accent` (`'blue' | 'green' | 'orange' | 'violet' | 'neutral' | 'ai'`) that colors the node's icon on the canvas and in the palette; it is read by node type and never saved into the diagram. `WorkflowNodeTemplateProps` gains `accent` and `NodeIconAccent` is exported. Node definitions resolve as soon as `WorkflowBuilder.Root` mounts, so a layout without a Palette also shows node accents and the node Properties form.
