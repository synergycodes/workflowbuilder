---
'@workflowbuilder/sdk': minor
---

New `useWorkflowBuilderState()` reads the state behind the built-in toggles (read-only, theme, language, both sidebars, palette filter, layout direction, workflow name) and behind the editor header's supplied controls (`version`, `isCleanUpPending`, `isCanvasEmpty`, `availableActions`). `<WorkflowBuilder.Root>` accepts `builtInControls`.
