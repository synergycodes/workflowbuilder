---
'@workflowbuilder/sdk': minor
---

`onStart` on `<WorkflowBuilder.Root>` runs once after the initial diagram load with `{ isEmpty, openTemplates }`; the default opens the template selector for an empty diagram and an app can replace it. A `name` prop no longer counts as diagram data, so an app that passes only a name now gets the welcome selector for an empty diagram. The template selector no longer opens over a diagram that has just loaded. With `strategy: 'api'`, the initial `name`, `initialNodes`, `initialEdges` and `layoutDirection` props now reach the store only after the load request settles, instead of at mount and again after the fetch.
