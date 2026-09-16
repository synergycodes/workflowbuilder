---
'@workflowbuilder/sdk': minor
---

The apex of a self-connecting edge sits 48px above the node's top edge regardless of the node height and of where the source port sits (design decision of 2026-09-16). `SELF_CONNECTING_EDGE_LABEL_OFFSET` is now `48` and is measured from the top edge; `getSelfLoopHeight` is exported for custom edges that draw their own loop. Before, the loop grew with the node height and reached 132px above a 64px node.
