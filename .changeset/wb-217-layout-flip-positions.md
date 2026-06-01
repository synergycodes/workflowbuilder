---
'@workflowbuilder/sdk': minor
---

feat: `setLayoutDirection` and `toggleLayoutDirection` from `useWorkflowBuilderActions()` now accept an optional `LayoutChangeOptions` (`{ flipPositions?, fitView? }`). Set `flipPositions: true` to also reflow node coordinates (swaps each node's `x`/`y`) so the diagram visually re-lays-out along the new axis, and `fitView: true` to re-fit the view afterwards. Both default to `false`, so existing callers are unaffected — a bare direction change still only re-orients handles and re-routes edges. The new `LayoutChangeOptions` type is exported from the package barrel.
