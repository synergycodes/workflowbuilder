---
'@workflowbuilder/temporal': minor
---

A run's status moves to `running` as soon as it starts, so `updateExecutionStatus` receives `running` before the first node runs and a store can stamp the start.

Breaking changes:

- Event Histories recorded by 0.1.0 and 0.2.0 no longer replay. Let runs started on those versions finish before the worker upgrades.
