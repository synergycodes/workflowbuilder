---
'@workflowbuilder/ui': patch
---

Several components pick up metrics that drifted from the design library: `NavButton` label padding, menu item inline padding, `Snackbar` width and action buttons, `SegmentPicker` padding and `Avatar` sizes. Edge labels subtract their border width from their padding, so the outer size matches the design and selecting a label no longer resizes it.

`--wb-public-segment-picker-padding` is removed; the padding follows the size of the picker instead of one shared value.
