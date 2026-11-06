---
'@workflowbuilder/ui': minor
---

New `NodePanel.Overlay` slot and node run status parts `NodeRunRing`, `NodeRunVeil`, `NodeRunProgress`, `NodeRunIndicator` and `NodeRunBadge`, with read-only `runStatusPresets` for the thirteen design-system statuses. While an Overlay renders, the node container is `position: relative` and node handles sit at `z-index: 1`, so absolutely positioned content inside the node is placed against the container, and a selected node hides its focus ring under a `NodeRunRing` unless `--wb-public-node-box-shadow-selected-with-run-status` brings it back.
