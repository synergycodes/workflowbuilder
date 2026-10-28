# Changelog

## [0.2.0] - 2026-10-02

A node can park the run until a verdict from outside resumes it. Event Histories recorded by 0.1.0 still replay; the breaking changes concern custom ports, stores and code that reads node results.

### Added

- `TemporalWorkflowEngine.resolveNode` and the `resolveNodeUpdate` Workflow Update (`RESOLVE_NODE_UPDATE_NAME`): a node executor can return `{ waiting: true }` to park the run until `resolveNode` delivers the node's completion. Refusals come back as a `ResolveNodeResult`, and `resolveTimeoutMs` bounds the wait for acceptance.
- `outcome` on a node completion: declares the run's result, which the terminal `completed` write passes to `updateExecutionStatus` as a fourth argument.

### Changed

- **Breaking.** Widen `NodeExecutionResult` to `CompletedNodeExecution | WaitingNodeExecution`. Narrow on `waiting` before reading `.output`.
- **Breaking.** Require `resolveNode` on a custom `WorkflowEnginePort`. It takes a `ResolveNodeInput` (`{ executionId, nodeId, resolution }`).
- **Breaking.** Send the `node_waiting` event and the `waiting` and `running` statuses to the `ExecutionStore`. They can arrive after a cancel or a terminal status, so the store must not let them replace a cancel it recorded or a terminal status.

## [0.1.0] - 2026-09-21

First release. Run Workflow Builder diagrams as durable Temporal Workflow Executions.

### Added

- `WorkflowBuilderPlugin` (package root): a Temporal Plugin that registers the node-execution activities on a Worker. It takes the node executors and the run store, and keeps all I/O out of the Workflow Execution.
- `runWorkflow` and `createRunWorkflow` (`@workflowbuilder/temporal/workflow`): the workflow-side runner to re-export from your own workflows module. `createRunWorkflow` accepts activity profiles, so timeouts and retry policies can differ per node type.
- `TemporalWorkflowEngine` (`@workflowbuilder/temporal/client`): starts and cancels runs from a backend without pulling in `@temporalio/worker`.
- `PermanentNodeExecutionError` and `TransientNodeExecutionError`: thrown from a node executor, they decide whether a failed node is retried or fails the run at once.
- Node labels appear as activity summaries in Event History, so a run reads in the Temporal UI the way the diagram reads in the editor.

[0.2.0]: https://www.npmjs.com/package/@workflowbuilder/temporal/v/0.2.0
[0.1.0]: https://www.npmjs.com/package/@workflowbuilder/temporal/v/0.1.0
