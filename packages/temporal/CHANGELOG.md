# Changelog

## [0.1.0] - 2026-09-21

First release. Run Workflow Builder diagrams as durable Temporal Workflow Executions.

### Added

- `WorkflowBuilderPlugin` (package root): a Temporal Plugin that registers the node-execution activities on a Worker. It takes the node executors and the run store, and keeps all I/O out of the Workflow Execution.
- `runWorkflow` and `createRunWorkflow` (`@workflowbuilder/temporal/workflow`): the workflow-side runner to re-export from your own workflows module. `createRunWorkflow` accepts activity profiles, so timeouts and retry policies can differ per node type.
- `TemporalWorkflowEngine` (`@workflowbuilder/temporal/client`): starts and cancels runs from a backend without pulling in `@temporalio/worker`.
- `PermanentNodeExecutionError` and `TransientNodeExecutionError`: thrown from a node executor, they decide whether a failed node is retried or fails the run at once.
- Node labels appear as activity summaries in Event History, so a run reads in the Temporal UI the way the diagram reads in the editor.

[0.1.0]: https://www.npmjs.com/package/@workflowbuilder/temporal/v/0.1.0
