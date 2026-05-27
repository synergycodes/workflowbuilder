import type { WorkflowBuilderEdge } from '../../node/node-data';

export function filterOutEdgesBySourceHandles(
  edges: WorkflowBuilderEdge[],
  sourceNodeId: string,
  sourceHandles: string[],
): WorkflowBuilderEdge[] {
  if (sourceHandles.length === 0) {
    return edges;
  }

  const handleSet = new Set(sourceHandles);

  return edges.filter(
    (edge) => edge.source !== sourceNodeId || !edge.sourceHandle || !handleSet.has(edge.sourceHandle),
  );
}
