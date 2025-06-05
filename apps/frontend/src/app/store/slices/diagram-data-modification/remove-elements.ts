import { Edge, Node } from '@xyflow/react';
import { GetDiagramState, SetDiagramState } from '@/store/store';

export function removeElements(
  elements: { nodes?: Node[]; edges?: Edge[] },
  set: SetDiagramState,
  get: GetDiagramState,
) {
  const { nodes, edges } = elements;
  if (nodes) {
    set({
      nodes: get().nodes.filter((node) => !nodes.some((nodeToRemove) => nodeToRemove.id === node.id)),
    });
  }

  if (edges) {
    set({
      edges: get().edges.filter((edge) => !edges.some((edgeToRemove) => edgeToRemove.id === edge.id)),
    });
  }
}
