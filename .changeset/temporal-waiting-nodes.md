---
'@workflowbuilder/temporal': minor
---

A node executor can return `{ waiting: true }` to park the run until `TemporalWorkflowEngine.resolveNode` delivers the node's completion, which may declare a run `outcome`; `NodeExecutionResult` is now that union, so code reading `.output` must narrow it first, and `WorkflowEnginePort` requires `resolveNode`. Around a parked node the store also receives the advisory `waiting` and `running` statuses, which can land after a cancel, and the terminal `completed` write carries the `outcome` as a fourth argument of `updateExecutionStatus`.
