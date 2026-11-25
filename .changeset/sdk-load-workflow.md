---
'@workflowbuilder/sdk': minor
---

`useWorkflowBuilderActions()` gains `loadWorkflow(model)`, which replaces the diagram in the editor with a `DiagramModel` of the app's own, the same way the template selector does: nodes snap to the canvas grid, one undo step, the view fits the result if the canvas has mounted, and nothing happens in read-only mode. A loaded template now snaps to the grid set in `reactFlowProps` (`snapToGrid`, `snapGrid`) instead of a fixed 18 px, and templates added through a `getTemplates` plugin snap too.
