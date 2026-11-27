---
'@workflowbuilder/sdk': minor
---

Unsaved changes are now saved when `<WorkflowBuilder.Root>` unmounts, for example on a route change in a single-page app; before, only a tab close or reload saved. It is an automatic save like the one on tab close: `onDataSave` receives `{ isAutoSave: true }`, `autoSave: false` turns it off, and it is skipped while another save is still in progress.
