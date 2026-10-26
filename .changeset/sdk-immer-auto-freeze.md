---
'@workflowbuilder/sdk': patch
---

Node data written by `setNodeData` / `setNodeProperties` is no longer frozen by immer, so code that writes into it (for example a JSON Schema validator) no longer throws `object is not extensible`. The SDK no longer changes immer's global auto-freeze setting.
