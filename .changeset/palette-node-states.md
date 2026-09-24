---
'@workflowbuilder/sdk': minor
---

Palette entries render the canvas Node states instead of their own styling: hover is the Node Hover state, the drag preview is the Node Active state (outline and ring), and entries that cannot be added (read-only mode) render the Node Disabled state instead of a faded copy. `WorkflowNodeTemplateProps` gains `disabled?: boolean`; the built-in templates forward it.

Migration for custom node templates: forward `disabled` to `NodePanel.Root`, `NodeIcon` and `NodeDescription`, otherwise the palette entry looks draggable while the palette is locked (the wrapper no longer fades it).
