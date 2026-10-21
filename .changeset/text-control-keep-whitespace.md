---
'@workflowbuilder/sdk': patch
---

The `Text` form control no longer trims a value when the field loses focus, so leading and trailing spaces are kept, as in `TextArea`. An empty or whitespace-only field is still stored as `undefined`.
