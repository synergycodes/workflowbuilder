---
'@workflowbuilder/ui': major
---

**Breaking.** Edges are 1 px in every state and `--wb-public-edge-stroke-width-select` is gone; set `--wb-public-edge-stroke-width` for a thicker line. `useEdgeStyle` takes `runState` (`pending`, `running`, `completed`, `outOfRun`) and `lineType` (`solid`, `dashed`), styled through the new `--wb-public-edge-color-*`, `--wb-public-edge-dash-*` and `--wb-public-edge-animation-running` variables.
