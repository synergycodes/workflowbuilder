import { Connection } from '@xyflow/react';
import { isInnerHandle } from '../handles/is-inner-handle';

export function getEdgeZIndex(connection: Connection): number | undefined {
  const isOverlayEdge = isInnerHandle(connection.sourceHandle) || isInnerHandle(connection.targetHandle);

  return isOverlayEdge ? OVERLAY_Z_INDEX : BASE_Z_INDEX;
}

const OVERLAY_Z_INDEX = 1001;
const BASE_Z_INDEX = undefined;
