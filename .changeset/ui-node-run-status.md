---
'@workflowbuilder/ui': minor
---

- New `NodePanel.Overlay` slot: a layer over the whole node for status visuals.
- New run status parts: `NodeRunRing`, `NodeRunIndicator` and `NodeRunBadge` take a `RunStatusTone`; `NodeRunProgress` and `NodeRunVeil` complete the set.
- New `runStatusPresets`: read-only parts of the thirteen design-system statuses, keyed by `NodeRunStatus`.
- New `--wb-public-node-box-shadow-selected-with-run-status` sets the focus ring of a selected node whose Overlay holds a `data-node-run-overlay` element (none by default).

Migration: while `NodePanel.Overlay` renders, the node container is `position: relative` and node handles get `z-index: 1` to stay above the Overlay; absolutely positioned content inside the node is now placed against the container.
