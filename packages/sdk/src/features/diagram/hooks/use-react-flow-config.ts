import type { Connection, Edge, IsValidConnection } from '@xyflow/react';
import { useCallback } from 'react';

import { getIsValidConnection } from '../../../data/react-flow-config';
import type { WorkflowBuilderEdge } from '../../../node/node-data';
import { getStoreNodes } from '../../../store/slices/diagram-slice/actions';

/**
 * Adapts the consumer's enriched `isValidConnection` to ReactFlow's native
 * signature, resolving the candidate's node ids against the live store. Returns
 * `undefined` when no callback is set (ReactFlow keeps its default), and allows
 * the connection when a node cannot be resolved.
 */
export function useIsValidConnection(): IsValidConnection<WorkflowBuilderEdge> | undefined {
  // Read outside the callback so the dep stays stable across renders.
  const isValidConnection = getIsValidConnection();

  const adapter = useCallback<IsValidConnection<WorkflowBuilderEdge>>(
    (candidate: Connection | Edge) => {
      if (!isValidConnection) return true;

      const nodes = getStoreNodes();
      const sourceNode = nodes.find((node) => node.id === candidate.source);
      const targetNode = nodes.find((node) => node.id === candidate.target);
      if (!sourceNode || !targetNode) return true;

      const connection: Connection = {
        source: candidate.source,
        target: candidate.target,
        sourceHandle: candidate.sourceHandle ?? null,
        targetHandle: candidate.targetHandle ?? null,
      };

      return isValidConnection({ connection, sourceNode, targetNode });
    },
    [isValidConnection],
  );

  return isValidConnection ? adapter : undefined;
}
