---
'@workflowbuilder/sdk': major
---

Public names follow one vocabulary: the bar above the canvas is the editor header, and what the user names is the workflow. Renamed, without aliases: `WorkflowBuilder.TopBar` -> `WorkflowBuilder.EditorHeader`, `WorkflowBuilderTopBar` -> `WorkflowBuilderEditorHeader`, the store's `documentName` and `setDocumentName` -> `workflowName` and `setWorkflowName`, the `toggleDarkMode` action -> `toggleTheme`, the `'PropertiesBar'` slot -> `'PropertiesPanel'`, `PropertiesBarProps` -> `WorkflowBuilderPropertiesPanelProps`, the `'DiagramContainer'` slot -> `'Canvas'`, `DiagramContainerProps` -> `WorkflowBuilderCanvasProps` and `WorkflowNodeTemplateProps` -> `WorkflowBuilderNodeTemplateProps`. The `PropertiesBar` component is no longer exported: mount `<WorkflowBuilder.PropertiesPanel />` and decorate the `'PropertiesPanel'` slot instead. A decorator on `'PropertiesBar'` or `'DiagramContainer'` registers nothing and logs a `console.warn` naming the new slot.
