import { getNodesBounds, Node, Viewport } from '@xyflow/react';
import { Point } from '@workflow-builder/types/common';
import { SNAP_GRID, SNAP_IS_ACTIVE } from '@/features/diagram/diagram.const';

export function getNodesCenterPoint(nodes: Node[]): Point {
  const bounds = getNodesBounds(nodes);

  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

export function transformPointFromWindowToDiagramCoordinates(
  pointInWindowCoordinates: Point,
  viewPort?: Viewport,
): Point {
  const zoomFactor = viewPort?.zoom || 1;

  return {
    x: (pointInWindowCoordinates.x - (viewPort?.x || 0)) / zoomFactor,
    y: (pointInWindowCoordinates.y - (viewPort?.y || 0)) / zoomFactor,
  };
}

export function snapToGridIfNeeded(node?: { x?: number; y?: number }) {
  const { x = 0, y = 0 } = node || {};

  if (SNAP_IS_ACTIVE) {
    const gridSizeX = SNAP_GRID?.[0] ?? 0;
    const gridSizeY = SNAP_GRID?.[1] ?? 0;

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
