---
'@workflowbuilder/ui': major
'@workflowbuilder/sdk': minor
---

`Button` takes `variant`, `size` and `shape` and composes its content from `prefixIcon`, `children` and `suffixIcon`. `LabelButtonProps` and `IconButtonProps` are redefined for this API, `Variant` is renamed to `ButtonVariant`, and `BaseRegularButtonProps` plus the old label/icon/icon+label component subtypes are removed; migrate variants (`gray` and the former outlined `secondary` both become the solid grey `secondary` - use `ghost-secondary` where an outlined treatment should stay - `error` is `critical`, `ghost-destructive` is `ghost-critical`), sizes (`extra-large`...`extra-small` become `xl`...`xs`), and `shape="circle"` (now `"round"`).

The public button CSS variables follow the same migration: the `gray`, `error` and `ghost-destructive` variable families are gone - retarget overrides to the `secondary`, `critical` and `ghost-critical` families - and the size suffixes in the variable names move from `-extra-large`...`-extra-small` to `-xl`...`-xs`. Note that the `secondary` variables now describe the solid grey variant; overrides written for the old outlined `secondary` belong on the `ghost-secondary` family.
