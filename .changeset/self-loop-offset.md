---
'@workflowbuilder/sdk': major
---

The apex of a self-connecting edge sits 48px above the source node's top edge, for any node height. `SELF_CONNECTING_EDGE_LABEL_OFFSET` is now `48` and is measured from that edge; `useSelfLoopApexY` is exported for custom edges that draw their own loop, and `SelfConnectingEdge` no longer takes `nodeHeight` (the node height alone cannot place the apex, since ports sit at a fixed offset inside the header rather than at mid-height).

Breaking changes:

- Drop the `nodeHeight` prop from any custom use of `SelfConnectingEdge`; the component reads the node position from the React Flow store.
- Previously the loop was drawn a flat 100px above the source port, which on a 64px node put the apex 68px above its top edge; loops on every node now peak 48px above it.
