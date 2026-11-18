---
'@workflowbuilder/sdk': minor
---

New `edgeEndpoint` prop on `<WorkflowBuilder.Root>` (`arrow`, `circle`, or `none` by default, so edges look as before) ends every built-in edge, including the one drawn while connecting, in a terminator at its target, in the colour of the line. `EdgePath`, the `'OptionalEdgePath'` slot and `EnhancedBaseEdge` take `endpoint` to set it for one edge.
