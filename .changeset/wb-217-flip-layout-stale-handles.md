---
'@workflowbuilder/sdk': patch
---

fix: re-measure node internals when `layoutDirection` changes, so edges re-route to the new handle positions instead of the stale ones React Flow had cached.
