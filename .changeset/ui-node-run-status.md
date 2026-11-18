---
'@workflowbuilder/ui': minor
---

New `NodePanel.Overlay` slot and node run status parts `NodeRunRing`, `NodeRunVeil`, `NodeRunProgress`, `NodeRunIndicator` and `NodeRunBadge`, with read-only `runStatusPresets` for the thirteen design-system statuses. While an Overlay renders, the node container is `position: relative` and node handles sit at `z-index: 1`, so absolutely positioned content inside the node is placed against the container, and `--wb-public-node-box-shadow-selected-with-run-status` sets the focus ring of a selected node under a `NodeRunRing` (the selected focus ring by default).
