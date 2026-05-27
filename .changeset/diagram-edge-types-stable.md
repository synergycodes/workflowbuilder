---
'@workflowbuilder/sdk': patch
---

perf: stop every edge re-rendering whenever the canvas re-renders. `DiagramContainer` defaulted `edgeTypes` to an inline `{}` (a fresh object each render), which busted the `edgeTypes` memo and handed ReactFlow a new `edgeTypes` identity on every render — so each render (e.g. every drag tick) re-rendered all edges. Extracted a `useEdgeTypes` hook with a stable empty default, mirroring `useNodeTypes`.
