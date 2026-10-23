---
'@workflowbuilder/sdk': major
---

After a failed `api` load (a non-2xx status, a network error or a body that is not JSON), the editor no longer opens the template selector and refuses to save for the rest of that `<WorkflowBuilder.Root>` mount, so it can no longer overwrite the workflow on the server that it could not load; a manual save shows the save error. Actions from `useWorkflowBuilderActions()` do nothing once their Root unmounts, and `save()` then resolves `'error'` without sending data.
