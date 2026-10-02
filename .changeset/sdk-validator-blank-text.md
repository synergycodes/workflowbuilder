---
'@workflowbuilder/sdk': minor
---

The form validator reads blank text as a missing value: a required `string` emptied to blank or whitespace now reports `required`, while a property whose `type` lists `null` accepts it as `null`. Type and format errors caused by a single variable reference such as `{{global.email}}` standing in for a typed value are no longer reported.
