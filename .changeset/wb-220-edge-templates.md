---
'@workflowbuilder/sdk': minor
---

feat: add `edgeTemplates` prop on `<WorkflowBuilder.Root>` for custom edge renderers — the edge mirror of `nodeTemplates`. Pass a `{ [edgeType]: Component }` map where each component takes ReactFlow's `EdgeProps`; edges whose `type` matches a key render with your component, and unregistered types fall back to the built-in `labelEdge`. Unlike node templates, edge templates need no adapter (the built-in edges already take `EdgeProps` directly), so the consumer component drops straight into ReactFlow's edge-type map. Exports the new `WorkflowBuilderEdgeTemplates` type from the package barrel.
