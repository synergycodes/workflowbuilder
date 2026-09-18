---
'@workflowbuilder/ui': patch
---

`Avatar` sizes `medium` and `small` bind the `--wb-ds-size-300` and `--wb-ds-size-225` primitives instead of literal values. The design library defines all four avatar sizes; the two smaller ones were written as literals because their primitives were read as missing.
