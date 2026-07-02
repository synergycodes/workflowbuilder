---
'@workflowbuilder/sdk': patch
---

The decision node no longer renders its node-level output port when branches exist - each branch carries its own source handle, so the outer one was a redundant, disconnected port. Branchless decision nodes keep the node-level port. Note: a saved diagram that connected an edge to a branched decision node's outer `source` handle loses that connection point.
