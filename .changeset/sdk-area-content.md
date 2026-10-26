---
'@workflowbuilder/sdk': minor
---

New `EditorHeaderToolsContent`, `EditorHeaderControlsContent`, `PaletteHeaderContent`, `PaletteFooterContent` and `PropertiesPanelHeaderContent` render their children in that area of the built-in interface from anywhere under `<WorkflowBuilder.Root>`, including a plugin component and a node's properties form. In the editor header and the footers own content stands before the built-in controls; in the sidebar headers it is a row under the title. An area without content disappears.
