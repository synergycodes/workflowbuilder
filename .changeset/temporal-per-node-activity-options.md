---
'@workflowbuilder/temporal': minor
---

Node activities are now scheduled with the node's label as their Temporal Summary, so Event History lists the diagram's own names instead of identical `executeNode` rows. New `createRunWorkflow({ nodeActivityProfiles })` on `@workflowbuilder/temporal/workflow` gives a node type its own timeout and retry cap; a type with no entry still resolves to `DEFAULT_NODE_ACTIVITY_PROFILE` (10 minutes, 2 attempts).

Re-exporting `runWorkflow` unchanged keeps the previous behaviour, so no migration is required. Profiles are configured on the workflow rather than on the plugin because the TypeScript SDK builds the workflow bundle from your own `workflows.ts`.
