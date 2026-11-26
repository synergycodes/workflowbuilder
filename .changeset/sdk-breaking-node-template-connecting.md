---
'@workflowbuilder/sdk': major
---

**Breaking.** `WorkflowBuilderNodeTemplateProps` and the built-in node templates no longer take `isConnecting`, which they never read: remove it where you pass it.
