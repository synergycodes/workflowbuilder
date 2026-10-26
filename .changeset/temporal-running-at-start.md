---
'@workflowbuilder/temporal': minor
---

A run's status moves to `running` as soon as it starts, so `updateExecutionStatus` receives `running` before the first node runs and a store can stamp the start. Runs started on an earlier version keep their old sequence and still replay.
