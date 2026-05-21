import type { Edge, Node } from '@xyflow/react';

import type { Selection } from '../types';

const getEdgesByNodeId = (nodeId: string, edges: Edge[]) =>
  edges.filter((edge: Edge) => edge.source === nodeId || edge.target === nodeId);

export const getSelectionWithNodesBetween = (selection: Selection, edges: Edge[]) => {
  const nodesIds = new Set(selection.nodes.map((node: Node) => node.id));

  const allEdges = selection.nodes.flatMap((node: Node) => getEdgesByNodeId(node.id, edges));

  const uniqueEdges = [...new Map(allEdges.map((edge: Edge) => [edge.id, edge])).values()];
  const currentEdges = uniqueEdges.filter((edge: Edge) => nodesIds.has(edge.source) && nodesIds.has(edge.target));

  selection.edges = currentEdges;

  return selection;
};
