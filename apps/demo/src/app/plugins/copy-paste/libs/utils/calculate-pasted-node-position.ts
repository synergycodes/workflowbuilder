import type { Node } from '@xyflow/react';

import type { Position } from '../types';
import { subtractPoints } from './points';
import { getNodesCenterPoint } from './position-utils';

export const calculateNodePastePositionOffset = (nodes: Node[], pastePosition: Position): Position => {
  const nodesCenterPoint = getNodesCenterPoint(nodes);

  return subtractPoints(pastePosition, nodesCenterPoint);
};
