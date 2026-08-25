---
'@workflowbuilder/ui': major
'@workflowbuilder/sdk': minor
---

`Button` takes `variant`, `size` and `shape` and composes its content from `prefixIcon`, `children` and `suffixIcon`. `LabelButtonProps` and `IconButtonProps` are redefined for this API, `Variant` is renamed to `ButtonVariant`, and `BaseRegularButtonProps` plus the old label/icon/icon+label component subtypes are removed; migrate variants (`gray` and the former outlined `secondary` both become the solid grey `secondary` - use `ghost-secondary` where an outlined treatment should stay - `error` is `critical`, `ghost-destructive` is `ghost-critical`), sizes (`extra-large`...`extra-small` become `xl`...`xs`), and `shape="circle"` (now `"round"`).
