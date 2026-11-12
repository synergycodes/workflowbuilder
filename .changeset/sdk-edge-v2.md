---
'@workflowbuilder/sdk': major
---

**Breaking.** Built-in edges are 1 px in every state (`--wb-public-edge-stroke-width-select` is gone, set `--wb-public-edge-stroke-width` for a thicker line), keyboard focus turns edges drawn with `useEdgeStyle` to the select colour, and the hit area is 12 px from `--wb-public-edge-hit-width` instead of xyflow's 20 px interaction path (`--wb-sdk-edge-clickable-border-width` is gone). New `EdgePath` and the `'OptionalEdgePath'` slot let a `place: 'wrapper'` decorator set `runState` and `lineType` on built-in and custom edges without touching edge data.
