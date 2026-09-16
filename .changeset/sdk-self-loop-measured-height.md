---
'@workflowbuilder/sdk': minor
---

Self-connecting edges use the measured source-node height for loop geometry and label placement. `SelfConnectingEdge` reads that height from the React Flow store when `nodeHeight` is omitted, so a custom edge that delegates to it no longer draws the loop as if the node had no height; `useSelfLoopNodeHeight` is exported alongside it.
