---
'@workflowbuilder/sdk': major
---

**Breaking.** The "Saved data has been restored" snackbar shows only when the SDK restored a saved diagram itself: one read from localStorage or returned by the `api` strategy's `load` endpoint. A starting diagram from `initialNodes` / `initialEdges` loads without it, and the `props` strategy never shows it; an app that wants the message with `props` shows its own.
