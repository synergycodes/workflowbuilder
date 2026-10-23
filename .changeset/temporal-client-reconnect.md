---
'@workflowbuilder/temporal': patch
---

`TemporalWorkflowEngine` connects again on the next call after a failed connection attempt, instead of failing every call until the process restarts.
