---
'@workflowbuilder/sdk': patch
---

Simultaneous loading of nodes and the palette can result in a race condition. If nodes are loaded before the palette, new errors (for example, for fields that were not evaluated earlier) are skipped, and the node only shows a “!” indicator when the user selects it.
