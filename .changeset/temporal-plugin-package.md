---
'@workflowbuilder/temporal': minor
---

First release. Run Workflow Builder diagrams as durable Temporal Workflow Executions: `WorkflowBuilderPlugin` registers the node-execution activities on a worker, `@workflowbuilder/temporal/workflow` exports the `runWorkflow` runner to re-export from your workflows module (or `createRunWorkflow` for per-node-type activity profiles), and `@workflowbuilder/temporal/client` exports `TemporalWorkflowEngine` to start and cancel runs. Node labels appear as activity summaries in Event History, and `PermanentNodeExecutionError` / `TransientNodeExecutionError` decide whether a failed node is retried.
