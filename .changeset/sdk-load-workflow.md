---
'@workflowbuilder/sdk': minor
---

`useWorkflowBuilderActions()` gains `loadWorkflow(model)`, which replaces the diagram in the editor with a `DiagramModel` of the app's own, the same way the template selector does: nodes snap to the grid, one undo step, the view fits the result if the canvas has mounted, and nothing happens in read-only mode. Templates added through a `getTemplates` plugin now snap to the grid too, like `diagramTemplates`.
