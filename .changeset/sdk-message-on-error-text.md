---
'@workflowbuilder/sdk': patch
---

`MessageOnError` now shows its `text` whenever it is set, as plain text or as a translation key, instead of the raw validation error. `globalControls` no longer sets `text`, so the missing-variable message comes from the node's validation error.
