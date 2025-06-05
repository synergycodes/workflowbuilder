import { HandleType, Position } from '@xyflow/react';

export function getHandleType(position: Position): HandleType {
  return position === Position.Top || position === Position.Left ? 'target' : 'source';
}
