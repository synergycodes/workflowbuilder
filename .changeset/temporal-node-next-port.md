---
'@workflowbuilder/temporal': minor
---

`node_completed` and `node_failed` events carry `nextPort`, the handle the run left the node through (`'errorRoute'` for a routed failure), so a client can tell a taken edge from a pruned one.
