import type { XYPosition } from '@xyflow/react';

import type { Position } from '../types';

export const addPoints = (point1: Position | XYPosition, point2: Position | XYPosition) => ({
  x: point1.x + point2.x,
  y: point1.y + point2.y,
});

export const subtractPoints = (point1: Position | XYPosition, point2: Position | XYPosition) => ({
  x: point1.x - point2.x,
  y: point1.y - point2.y,
});
