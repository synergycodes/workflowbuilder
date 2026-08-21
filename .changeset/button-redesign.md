---
'@workflowbuilder/ui': major
'@workflowbuilder/sdk': major
---

`Button` takes `variant`, `size` and `shape` and composes its content from `prefixIcon`, `children` and `suffixIcon`; the label/icon/icon+label subtypes and their prop types are gone. Migrate variants (the outlined treatment is `ghost-secondary`, `secondary` is the solid grey former `gray`, `error` is `critical`, `ghost-destructive` is `ghost-critical`), sizes (`extra-large`…`extra-small` become `xl`…`xs`), and `shape="circle"` (now `"round"`).
