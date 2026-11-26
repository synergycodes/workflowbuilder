---
'@workflowbuilder/ui': patch
---

`Select` and `DatePicker` with `state="read-only"` no longer open, as with `readOnly`. `Select` no longer calls `onValueChange` when the current value is picked again. A controlled `Accordion` no longer changes the state it returns to once `open` is released.
