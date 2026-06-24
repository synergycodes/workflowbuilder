// Visualize executor — display-only node. The on-canvas card renders the
// upstream node's output in the UI; the executor only has to complete so the
// node lights up and the reveal animation fires. It needs no inputs.
export function executeVisualize() {
  return { output: { visualized: true } };
}
