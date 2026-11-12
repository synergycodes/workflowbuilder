---
'@workflowbuilder/ui': major
---

**Breaking.** Edges are 1 px in every state and `--wb-public-edge-stroke-width-select` is gone; set `--wb-public-edge-stroke-width` to restore a thicker line. `useEdgeStyle` takes `runState` (`pending`, `running`, `completed`, `outOfRun`) and `lineType` (`solid`, `dashed`); a run state overrides hover and selection colours. New variables: `--wb-public-edge-color-{pending,running,completed,out-of-run}`, `--wb-public-edge-dash-{running,dashed}`, `--wb-public-edge-animation-running` (static under `prefers-reduced-motion`).
