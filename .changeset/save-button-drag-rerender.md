---
'@workflowbuilder/sdk': patch
---

perf: stop the Save button re-rendering on every drag tick. `useAutoSave` now subscribes to the changes-tracker and integration stores imperatively instead of via reactive selectors, so a `trackFutureChange` per drag frame no longer forces the Save button to re-render. Autosave debounce, skip-on-drag, and cancel-on-save behavior are unchanged. Also stabilized ReactFlow's `panOnDrag` prop reference on the canvas.
