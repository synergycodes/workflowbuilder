---
'@workflowbuilder/sdk': patch
---

The Text control treats an `integer` field like a `number` one: it shows a number input and hands over a number instead of a string, so the field no longer fails its own schema.
