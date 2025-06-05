import { Connection } from '@xyflow/react';
import { isInnerHandle } from '../handles/is-inner-handle';

export function getEdgeZIndex(connection: Connection): number {
  const isOverlayEdge = isInnerHandle(connection.sourceHandle) || isInnerHandle(connection.targetHandle);
  return isOverlayEdge ? OVERLAY_ZINDEX : BASE_ZINDEX;
}

const OVERLAY_ZINDEX = 1001;
const BASE_ZINDEX = 0;
