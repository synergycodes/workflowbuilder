---
'@workflowbuilder/ui': major
---

Several components pick up metrics that drifted from the design library: `NavButton` label padding, menu item inline padding, `Snackbar` width and action buttons, `SegmentPicker` padding and `Avatar` sizes. Edge labels subtract their border width from their padding, so the outer size matches the design. The heavier stroke a selected label carries is drawn inward, the way the master's inside stroke works, so selection no longer resizes it either.

Breaking changes:

- `SegmentPicker` no longer pads its container, and `--wb-public-segment-picker-padding` is gone with it. Every variant of the design master sits at zero padding; the 4px that used to be there came from a token of the old system with no counterpart in this one. The track still shows through the 4px gap between segments, which `--wb-public-segment-picker-gap` controls. Drop any override of the removed property.
