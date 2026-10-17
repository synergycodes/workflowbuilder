---
'@workflowbuilder/temporal': minor
---

`ActivityProfile` (and `nodeActivityProfiles`) gains an optional `heartbeatTimeout` key for long-running activities that need Temporal to detect a stalled or crashed worker faster than `startToCloseTimeout` alone allows.
