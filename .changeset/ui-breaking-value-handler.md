---
'@workflowbuilder/ui': major
---

**Breaking.** Controls that report a value use Base UI's handler names, so an old handler stops compiling instead of receiving its arguments swapped: `Select` and `SegmentPicker` take `onValueChange(value, event)` instead of `onChange(event, value)`, `DatePicker` takes `onValueChange(value)` instead of `onChange(value)`, and `Switch` and `IconSwitch` take `onCheckedChange(checked, event)` instead of `onChange(checked, event)`. Checkbox, Radio, Input and TextArea keep the native `onChange(event)`.
