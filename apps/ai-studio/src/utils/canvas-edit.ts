// Not `nodeDragChange`: the SDK sends it for every node change, a selection or a measurement included.
const CANVAS_EDITS: ReadonlySet<string> = new Set([
  'nodeDragStart',
  'addNode',
  'addEdge',
  'delete',
  'dataUpdate',
  'layoutDirection',
  'import',
  'selectTemplate',
  'undo',
  'redo',
]);

/** Whether a `trackFutureChange` name is an edit of the graph. */
export function isCanvasEdit(changeName: string): boolean {
  return CANVAS_EDITS.has(changeName);
}
