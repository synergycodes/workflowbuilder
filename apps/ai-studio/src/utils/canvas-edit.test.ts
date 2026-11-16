import { describe, expect, it } from 'vitest';

import { isCanvasEdit } from './canvas-edit';

describe('isCanvasEdit', () => {
  it.each([
    'nodeDragStart',
    'addNode',
    'addEdge',
    'delete',
    'dataUpdate',
    'layoutDirection',
    'import',
    'selectTemplate',
  ])('%s edits the graph', (changeName) => {
    expect(isCanvasEdit(changeName)).toBe(true);
  });

  it.each(['undo', 'redo'])('%s changes the graph back or forth, so it counts', (changeName) => {
    expect(isCanvasEdit(changeName)).toBe(true);
  });

  it.each([
    ['nodeDragChange', 'sent for a selection or a measurement too'],
    ['nodeDragStop', 'the drag already counted when it started'],
    ['setDiagramModel', 'loads a graph'],
    ['manualSave', 'saves without changing the graph'],
    ['', "the tracker's initial value"],
    ['somePluginChange', 'a name nobody listed'],
  ])('%s is not an edit: %s', (changeName) => {
    expect(isCanvasEdit(changeName)).toBe(false);
  });
});
