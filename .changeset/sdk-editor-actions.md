---
'@workflowbuilder/sdk': minor
---

`useWorkflowBuilderActions()` gains `openTemplates`, `deleteSelection` (the whole selection, through the same confirmation and undo path as the Delete key), `setLanguage` and `renameDocument`. Actions that change the persisted diagram now do nothing in read-only mode; this includes the existing `setLayoutDirection` and `toggleLayoutDirection`. The template selector, including the welcome one on an empty diagram, no longer opens in read-only mode. The editor's modal windows now mount from `<WorkflowBuilder.Root>`, so `openSettings`, `openImport`, `openExport` and `openTemplates` also work in a custom layout without the canvas.
