---
'@workflowbuilder/temporal': minor
---

`TemporalWorkflowEngine.submit` reports a start that did not go through as a result instead of throwing: `run_not_started` when Temporal has no run under the execution id, `start_unconfirmed` when that could not be determined. `cancel` reports `run_not_found` instead of swallowing it.

Breaking changes:

- `WorkflowEnginePort.submit` and `cancel` return `SubmitResult` and `CancelResult`. A caller that awaited them for the side effect alone keeps working; an implementer of the port returns the new shapes.
