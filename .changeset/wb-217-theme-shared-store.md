---
'@workflowbuilder/sdk': patch
---

fix: theme now lives in a shared store applied to the DOM on `<WorkflowBuilder.Root>` mount, so a persisted theme paints on first load even without the app bar and multiple consumers stay in sync. Reads of `document` / `localStorage` are guarded, so importing the SDK server-side no longer throws.
