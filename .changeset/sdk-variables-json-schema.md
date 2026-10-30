---
'@workflowbuilder/sdk': minor
---

Variables now support returning different values for different source handles. Variables are now defined using a JSON schema rather than a flattened list, providing a foundation for future validation. `schemaOutput` keys the schema by handle id in `bySourceHandle` and by handle type in `bySourceHandleType` (`settled` for every handle, `success`, or `error` for handles whose id contains `error`). A `$ref` into the same schema (`#/$defs/...`, `#/definitions/...`) is resolved when building suggestions.
