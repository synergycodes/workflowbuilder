import type { Connection } from '@xyflow/react';

import type { WorkflowBuilderEdge } from '../../node/node-data';

export function removeEdgesMatchingPattern(
  edges: WorkflowBuilderEdge[],
  connections: Partial<Connection>[],
): WorkflowBuilderEdge[] {
  return edges.filter((edge) => {
    /*
      You can pass source, and sourceHandle and it will find all edges with it.
      You can pass target and it will remove all edges targeting node etc.

      You can pass multiple and this will remove all edges attached to node-1:
      removeEdgesMatchingPattern(edges, [{ source: 'node-1' }, { target: 'node-1' }]);
    */
    const shouldRemove = connections.some((connection) =>
      [
        !connection.source || connection.source === edge.source,
        !connection.sourceHandle || connection.sourceHandle === edge.sourceHandle,
        !connection.target || connection.target === edge.target,
        !connection.targetHandle || connection.targetHandle === edge.targetHandle,
      ].every(Boolean),
    );

    if (shouldRemove) {
      return false;
    }

    return true;
  });
}
