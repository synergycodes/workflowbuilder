import { WorkflowBuilderEdge } from '@workflow-builder/types/node-data';

export function filterOutEdgesBySourceHandles(
  edges: WorkflowBuilderEdge[],
  sourceHandles: string[],
): WorkflowBuilderEdge[] {
  if (sourceHandles.length === 0) {
    return edges;
  }

  const handleSet = new Set(sourceHandles);

  return edges.filter((edge) => !edge.sourceHandle || !handleSet.has(edge.sourceHandle));
}
