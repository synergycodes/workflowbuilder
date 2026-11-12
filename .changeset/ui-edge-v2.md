---
'@workflowbuilder/ui': major
---

**Breaking.** Edges are 1 px in every state: `--wb-public-edge-stroke-width` defaults to `var(--wb-ds-canvas-edge-stroke-regular)` and `--wb-public-edge-stroke-width-select` is gone. `useEdgeStyle` takes `runState` (`pending`, `running`, `completed`, `outOfRun`) and `lineType` (`solid`, `dashed`), returns `EdgeStyle`, and reads the new `--wb-public-edge-color-{pending,running,completed,out-of-run}`, `--wb-public-edge-dash-{running,dashed}` and `--wb-public-edge-animation-running` variables.
