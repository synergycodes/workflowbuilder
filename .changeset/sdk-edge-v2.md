---
'@workflowbuilder/sdk': major
---

**Breaking.** Edges are 1 px in every state, and the hit area width comes from `--wb-public-edge-hit-width` (default `12`, set it to `20` to keep the previous hit area); `--wb-public-edge-stroke-width-select` and `--wb-sdk-edge-clickable-border-width` are gone. `useLabelEdgeHover` takes only `id` and no longer returns `style`, only `hovered` and the label handlers: pass `state` and `hovered` to `OptionalEdgePath` instead.

Keyboard focus shows the select colour, except during and after a run, when the status colour wins and focus on an edge is not visible. New `EdgePath` and the `'OptionalEdgePath'` slot let a plugin set `runState` and `lineType` on built-in and custom edges, and `SelfConnectingEdge` takes `lineType`.
