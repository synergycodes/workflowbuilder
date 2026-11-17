---
'@workflowbuilder/sdk': minor
---

The form validator reads blank text as a missing value, in nested objects too: a required `string` emptied to blank or whitespace now reports `required`, while a top-level property whose `type` lists `null` accepts it as `null`. Errors caused by a single variable reference such as `{{global.email}}` standing in for a typed value (`type`, `format`, `pattern`, also inside nested objects and arrays of strings) are no longer reported. Properties of type `date`, `datetime` and `time` are validated: a value passes as a date string, an `HH:mm` clock, or a single variable reference. The `globalControls` export now targets `#/properties/customError` instead of `#/properties/missingPreviousVariable` and carries no default text.
