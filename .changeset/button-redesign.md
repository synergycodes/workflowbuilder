---
'@workflowbuilder/ui': major
'@workflowbuilder/sdk': minor
---

`Button` takes `variant`, `size` and `shape` and composes its content from `prefixIcon`, `children` and `suffixIcon`; the label/icon/icon+label subtypes and their prop types are gone. Migrate variants (`gray` and the former outlined `secondary` both become the solid grey `secondary` — reach for `ghost-secondary` where an outlined treatment should stay — `error` is `critical`, `ghost-destructive` is `ghost-critical`), sizes (`extra-large`…`extra-small` become `xl`…`xs`), and `shape="circle"` (now `"round"`).
