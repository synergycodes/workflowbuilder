---
'@workflowbuilder/ui': minor
---

New `NodePanel.Overlay` slot and node run status parts `NodeRunRing`, `NodeRunVeil`, `NodeRunProgress`, `NodeRunIndicator` and `NodeRunBadge`, with read-only `runStatusPresets` for the thirteen design-system statuses, the `NODE_RUN_TONES` list and the shared `--wb-public-node-run-status-{stroke,halo,bg,fg}-<tone>` palette. A part also takes a custom tone name: define its variables in CSS, and a missing one falls back to `neutral` (the halo to none). While an Overlay renders, the node container is `position: relative` and node handles sit at `z-index: 1`, so absolutely positioned content inside the node is placed against the container.
