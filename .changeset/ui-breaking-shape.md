---
'@workflowbuilder/ui': major
---

**Breaking.** `shape` is now the geometry and `variant` the style, as on `Button`: on `NavButton` and `MenuTriggerButton` replace `variant="round"` with `shape="round"` (`variant` now takes `'default' | 'plain'`, and the new `NavButtonShape` / `NAV_BUTTON_SHAPES` hold `'square' | 'round'`), and on `SegmentPicker` replace `shape="circle"` with `shape="round"`. `--wb-public-segment-picker-circle-border-radius` keeps its name and styles `shape="round"`.
