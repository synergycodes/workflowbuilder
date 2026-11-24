---
'@workflowbuilder/sdk': major
---

A validation error on a field whose name has a space, a non-ASCII letter or `%` now marks that field in the form: the validator reports its path as a plain JSON Pointer, as Ajv does, instead of percent-encoded. If you decoded `instancePath` yourself, remove that step.
