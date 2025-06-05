import { LayoutDirection } from '@workflow-builder/types/common';
import { HandleType, Position } from '@xyflow/react';

export function getHandlePosition({ handleType, direction }: GetHandlePositionOptions) {
  return HANDLE_POSITION_MAP[`${handleType}-${direction}`];
}

const HANDLE_POSITION_MAP: Record<`${HandleType}-${LayoutDirection}`, Position> = {
  'source-DOWN': Position.Bottom,
  'source-RIGHT': Position.Right,
  'target-DOWN': Position.Top,
  'target-RIGHT': Position.Left,
};

type GetHandlePositionOptions = {
  handleType: HandleType;
  direction: LayoutDirection;
};
