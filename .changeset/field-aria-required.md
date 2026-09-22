---
'@workflowbuilder/ui': patch
---

`Select` and `DatePicker` set `aria-required` on their trigger when the field is required, so the requirement reaches a screen reader and not only the asterisk beside the label. `Input` and `TextArea` already carried the native attribute.
