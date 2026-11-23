---
'@workflowbuilder/sdk': patch
---

Import in the project menu is disabled while the editor is read-only, and `actions.openImport()` does nothing then, like the other actions that change the persisted diagram. An Import modal already open when read-only mode switches on closes without importing.
