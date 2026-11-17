---
'@workflowbuilder/sdk': major
---

**Breaking.** Edges are 1 px in every state, keyboard focus shows the select colour, and the hit area width comes from `--wb-public-edge-hit-width` (default `12`, set it to `20` to keep the previous hit area); `--wb-public-edge-stroke-width-select` and `--wb-sdk-edge-clickable-border-width` are gone, and `useLabelEdgeHover` takes only `id` and returns only `hovered` and the label handlers. New `EdgePath` and the `'OptionalEdgePath'` slot let a plugin set `runState` and `lineType` on built-in and custom edges, and `SelfConnectingEdge` takes `lineType`.
