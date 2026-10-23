---
'@workflowbuilder/temporal': minor
---

Add optional `heartbeatTimeout` to node activity profiles so heartbeating executors can detect worker loss sooner than their execution timeout. Document native Temporal heartbeat and cancellation handling for long-running executors.
