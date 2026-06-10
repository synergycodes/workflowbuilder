---
'@workflowbuilder/sdk': minor
---

feat: add `edgeTemplates` prop on `<WorkflowBuilder.Root>` for custom edge renderers. Pass a `{ [edgeType]: Component }` map of components taking ReactFlow's `EdgeProps`; edges whose `type` matches a key render with your component, and unregistered types fall back to the built-in `labelEdge`. Also exports the `WorkflowBuilderEdgeTemplates` type.
