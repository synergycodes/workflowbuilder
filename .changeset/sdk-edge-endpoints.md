---
'@workflowbuilder/sdk': minor
---

New `edgeEndpoint` prop on `<WorkflowBuilder.Root>` (`arrow`, `circle`, `none`) ends every edge, including the one drawn while connecting, in a terminator at its target, in the colour of the line. The default is `none`, so edges look as before. `EdgePath`, the `'OptionalEdgePath'` slot and `EnhancedBaseEdge` take `endpoint` to set it for one edge.
