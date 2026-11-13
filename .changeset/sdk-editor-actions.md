---
'@workflowbuilder/sdk': minor
---

`useWorkflowBuilderActions()` gains `openTemplates`, `deleteSelection` (the whole selection, with the Delete key's confirmation and undo), `setLanguage`, `setWorkflowName`, and `cleanUp`, `saveAsPdf` and `publish`, which run what `EditorHeaderCleanUp`, `EditorHeaderSaveAsPdf` and `EditorHeaderPublish` supply; the modal openers now also work in a custom layout without the canvas. In read-only mode every action that changes the persisted diagram does nothing, the existing `setLayoutDirection` and `toggleLayoutDirection` included, and the template selector no longer opens, the welcome one included.
