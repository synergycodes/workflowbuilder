---
'@workflowbuilder/ui': major
'@workflowbuilder/sdk': minor
---

`NavButton` takes `size`, `variant` (`square`, `round`, `plain`), `prefixIcon`, `suffixIcon` and `children` instead of inferring a subtype from the children structure, sizes are letter-based, and the selected state no longer shares a treatment with the pointer-down state. `MenuTriggerButton` is new, and `SegmentPicker` keeps its API while adopting the new slots.
