import { Point } from '@workflow-builder/types/common';
import { XYPosition } from '@xyflow/react';

export function addPoints(point1: Point | XYPosition, point2: Point | XYPosition) {
  return { x: point1.x + point2.x, y: point1.y + point2.y };
}

export function subtractPoints(point1: Point | XYPosition, point2: Point | XYPosition) {
  return { x: point1.x - point2.x, y: point1.y - point2.y };
}
