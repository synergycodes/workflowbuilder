---
'@workflowbuilder/sdk': patch
---

Node sections and rows (Decision branches, AI tool rows) bind their padding, gap and radius to the design roles `canvas/node/body-*` and `canvas/node/row-*` instead of raw spacing primitives; rendered values are unchanged.
