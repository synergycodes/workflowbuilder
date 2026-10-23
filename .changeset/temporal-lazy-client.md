---
'@workflowbuilder/temporal': minor
---

New `lazyClient(connectionOptions, clientOptions?)` in `@workflowbuilder/temporal/client`: a client factory for `TemporalWorkflowEngine` that closes the connection of a failed attempt, so retries during an outage leave no channel open.
