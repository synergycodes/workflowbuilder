---
'@workflowbuilder/ui': major
---

A destructive menu entry is expressed as a tone, not a variant: `MenuItem` takes `tone="critical"`, which colours the label and the icon and leaves the row the background every other row has. A disabled entry has no background either.

Breaking changes:

- Replace `destructive: true` with `tone: "critical"` on menu items.
- Drop overrides of `--wb-public-list-item-background-color-destructive`, `--wb-public-list-item-background-color-hover-destructive` and `--wb-public-list-item-color-destructive`. The tone exposes `--wb-public-list-item-color-critical`, `--wb-public-list-item-color-critical-disabled` and `--wb-public-list-item-icon-color-critical`; the row's red tints are gone.
