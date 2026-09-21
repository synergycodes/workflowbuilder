---
'@workflowbuilder/ui': major
'@workflowbuilder/sdk': minor
---

`NavButton` is rebuilt on the Design System 2.0 specification: it takes `size`, `variant` (`square`, `round`, `plain`), `prefixIcon`, `suffixIcon` and `children` instead of inferring a subtype from the children structure, and the selected state no longer shares a treatment with the pointer-down state. `Menu.TriggerButton` is new: an icon-only trigger that shows the pressed state while its `Menu` is open.

Breaking changes:

- Pass icons through `prefixIcon` or `suffixIcon`. An icon passed as `children` is rendered as label content, not as an icon.
- Migrate sizes to the letter scale.
- `SegmentPicker` keeps its API but adopts the new slots, so an icon passed as `SegmentPicker.Item` children must move to an explicit icon slot.
