---
'@workflowbuilder/sdk': minor
---

feat: add `useWorkflowBuilderActions()` hook exposing save / import / export / settings / read-only / theme / layout-direction actions. Lets custom layouts that omit `<WorkflowBuilder.TopBar />` trigger every action the built-in app bar offers. `toggleLayoutDirection` takes an optional `LayoutChangeOptions` (`{ flipPositions?, fitView? }`): `flipPositions` mirrors node `x`/`y` so the diagram re-lays-out along the new axis (a naive mirror, not auto-layout), and `fitView` re-fits the view afterwards. `setLayoutDirection` stays idempotent and takes no options. The `LayoutChangeOptions` and `WorkflowBuilderActions` types are exported from the package barrel. See the [Layout without the app bar guide](https://www.workflowbuilder.io/docs/guides/no-app-bar-layout/).
