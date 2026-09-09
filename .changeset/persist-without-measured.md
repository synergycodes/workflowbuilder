---
'@workflowbuilder/sdk': patch
---

Saved and exported diagrams (`getStoreDataForIntegration`, the localStorage/API/props integrations) no longer include the runtime `measured` node sizes; nodes are measured again on load, so stored data cannot carry stale dimensions.
