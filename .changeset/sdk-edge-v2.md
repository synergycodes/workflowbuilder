---
'@workflowbuilder/sdk': major
---

**Breaking.** Edges are 1 px in every state, and the hit area width comes from `--wb-public-edge-hit-width` (default `12`, `20` keeps the previous one); `--wb-public-edge-stroke-width-select` and `--wb-sdk-edge-clickable-border-width` are gone, keyboard focus shows the select colour except during and after a run, when the status colour wins, and `useLabelEdgeHover` takes only `id` and returns only `hovered` and the label handlers, no `style` (pass `state` and `hovered` to `OptionalEdgePath`). New `EdgePath` and the `'OptionalEdgePath'` slot let a plugin set `runState` and `lineType` on built-in and custom edges, and `SelfConnectingEdge` takes `lineType`.
