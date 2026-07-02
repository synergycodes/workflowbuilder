---
'@workflowbuilder/sdk': patch
---

The decision node no longer renders a node-level output port - branches are its only outputs. Execution routes exclusively through branch handles (an edge from the bare `source` could never fire), so the port only invited dead connections. Note: a saved diagram with an edge from a decision node's bare `source` handle loses that connection point.
