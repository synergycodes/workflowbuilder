---
'@workflowbuilder/sdk': minor
---

Palette entries render the canvas Node states instead of their own styling: hover is the Node Hover state, the drag preview is the Node Active state (outline and ring), and entries that cannot be added (read-only mode) use the Node Disabled state instead of a faded copy. The node templates (`WorkflowNodeTemplate`, `StartNodeTemplate`, `DecisionNodeTemplate`, `AiAgentNodeTemplate`) accept a `disabled` prop.
