---
'@workflowbuilder/sdk': patch
---

fix: handle (port) sizing is now applied globally to every `.react-flow__handle`
in the editor, not only to handles rendered inside `NodePanel.Handles`.
Previously, overflow-ui's port styling was scoped to `._handle-wrapper
.react-flow__handle`, so handles rendered elsewhere — decision-node branches and
AI-agent tool ports via `ConnectableItem`, and any custom node template that
drops `<Handle>` into its content area — fell through to React Flow's 5×5
default with no border. Ports across all node types now render at the same
size.
