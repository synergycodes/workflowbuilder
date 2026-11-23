---
'@workflowbuilder/sdk': minor
---

Unsaved changes are now saved when `<WorkflowBuilder.Root>` unmounts, so a route change in a single-page app no longer loses them; before, only a tab close or reload saved. It is an automatic save like the one on tab close: `onDataSave` receives `{ isAutoSave: true }`, and `autoSave: false` turns it off.
