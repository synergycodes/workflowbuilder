---
'@workflowbuilder/ui': major
'@workflowbuilder/sdk': minor
---

NavButton now uses letter sizes and explicit `size`, `styleVariant`, `prefixIcon`, `suffixIcon`, and `children` inputs instead of inferring variants from the children structure. Its persistent selected state is separate from the mouse-down state, and MenuTriggerButton is available as a fixed-size menu trigger composition.
