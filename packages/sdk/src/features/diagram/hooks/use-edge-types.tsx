import type { EdgeTypes } from '@xyflow/react';
import { useMemo } from 'react';

import { LabelEdge } from '../edges/label-edge/label-edge';

// Stable empty default: an inline `= {}` would be a fresh object on every
// render, busting the memo below and handing ReactFlow a new `edgeTypes`
// identity each render — which re-renders every edge on the canvas (WB-221).
const EMPTY_EDGE_TYPES: EdgeTypes = {};

export function useEdgeTypes(customEdgeTypes: EdgeTypes = EMPTY_EDGE_TYPES): EdgeTypes {
  return useMemo(() => ({ labelEdge: LabelEdge, ...customEdgeTypes }), [customEdgeTypes]);
}
