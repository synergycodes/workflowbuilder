---
'@workflowbuilder/sdk': major
---

**Breaking.** Built-in edges and the edge drawn while connecting end in an arrow at the target, in the colour of the line. `EdgePath` and the `'OptionalEdgePath'` slot take `endpoint` (`arrow`, `circle`, `none`), so a `place: 'wrapper'` decorator can change or remove it; `EnhancedBaseEdge` takes it too and draws none by default.
