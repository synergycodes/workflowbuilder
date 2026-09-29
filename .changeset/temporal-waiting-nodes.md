---
'@workflowbuilder/temporal': minor
---

A node executor can return `{ waiting: true }` to park the run until `TemporalWorkflowEngine.resolveNode` delivers the node's completion as the `resolveNodeUpdate` Workflow Update (`RESOLVE_NODE_UPDATE_NAME`); refusals come back as a `ResolveNodeResult`, and `resolveTimeoutMs` bounds the wait for acceptance. A completion may declare a run `outcome`, which the terminal `completed` write passes to `updateExecutionStatus` as a fourth argument.

Breaking changes:

- `NodeExecutionResult` is now `CompletedNodeExecution | WaitingNodeExecution`: narrow on `waiting` before reading `.output`.
- A custom `WorkflowEnginePort` must implement `resolveNode`, which takes a `ResolveNodeInput` (`{ executionId, nodeId, resolution }`).
- An `ExecutionStore` now receives the `node_waiting` event and the `waiting` and `running` statuses. They can arrive after a cancel or a terminal status, so the store must not let them replace a cancel it recorded or a terminal status.
