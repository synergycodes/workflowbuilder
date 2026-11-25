---
'@workflowbuilder/sdk': patch
---

`trackFutureChange` is now typed as `(changeName: string, params?: object) => void` instead of a rest parameter, so editors and the API reference show both parameters by name. Calls are unchanged.
