import { getReactFlowProps } from '../data/react-flow-config';
import { SNAP_GRID, SNAP_IS_ACTIVE } from '../features/diagram/diagram.const';
import type { DiagramModel } from '../node/common';

export function snapToGridIfNeeded(node?: { x?: number; y?: number }) {
  const { x = 0, y = 0 } = node || {};
  const { snapToGrid = SNAP_IS_ACTIVE, snapGrid = SNAP_GRID } = getReactFlowProps();

  if (snapToGrid) {
    const gridSizeX = snapGrid?.[0] ?? 0;
    const gridSizeY = snapGrid?.[1] ?? 0;

    return {
      x: Math.round(x / gridSizeX) * gridSizeX,
      y: Math.round(y / gridSizeY) * gridSizeY,
    };
  }

  return {
    x,
    y,
  };
}

export function snapDiagramToGrid(model: DiagramModel): DiagramModel {
  return {
    ...model,
    diagram: {
      ...model.diagram,
      nodes: model.diagram.nodes.map((node) => ({
        ...node,
        ...(node.position ? { position: snapToGridIfNeeded(node.position) } : {}),
      })),
    },
  };
}
