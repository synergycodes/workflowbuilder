---
'@workflowbuilder/sdk': minor
---

Node data gains an `isStartNode?: boolean` flag marking the workflow's entry point. Declare it on the palette item (`NodeDefinition`) and the editor copies it into the node's `data` when the node is dropped, so execution integrations can read `data.isStartNode` instead of matching the node's xyflow `type` against `'start-node'`. `templateType` keeps selecting the visual template only.
