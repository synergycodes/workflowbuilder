import { type Node, type Viewport, getNodesBounds } from '@xyflow/react';

import type { Position } from '../types';

export const getNodesCenterPoint = (nodes: Node[]): Position => {
  const bounds = getNodesBounds(nodes);

  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
};

export const transformPointFromWindowToDiagramCoordinates = (
  pointInWindowCoordinates: Position,
  viewPort?: Viewport,
): Position => {
  const zoomFactor = viewPort?.zoom || 1;

  return {
    x: (pointInWindowCoordinates.x - (viewPort?.x || 0)) / zoomFactor,
    y: (pointInWindowCoordinates.y - (viewPort?.y || 0)) / zoomFactor,
  };
};
