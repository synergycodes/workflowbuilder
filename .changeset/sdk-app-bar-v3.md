---
'@workflowbuilder/sdk': minor
---

Redesigned the editor header: Export and Import moved to the workflow menu next to the workflow name, and the header adapts to its own width (on narrow headers a ⋮ menu collects Clean up and Light / Dark). Clean up, Save as PDF, a version chip and Publish appear while the app or a plugin renders `EditorHeaderCleanUp`, `EditorHeaderSaveAsPdf`, `EditorHeaderVersion` and `EditorHeaderPublish`; the `cleanUp`, `saveAsPdf`, `version` and `publish` keys of `builtInControls` hide them.
