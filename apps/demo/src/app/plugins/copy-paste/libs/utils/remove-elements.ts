import type { Edge, Node } from '@xyflow/react';

/**
 * Utility to remove a selection of nodes and edges from the diagram.
 *
 * @param elements - Object containing nodes and/or edges to remove
 * @param getNodes - Function to get current nodes
 * @param setNodes - Function to set nodes
 * @param getEdges - Function to get current edges
 * @param setEdges - Function to set edges
 * @returns void
 */
export const removeElements = ({
  elements,
  getNodes,
  setNodes,
  getEdges,
  setEdges,
}: {
  elements: { nodes?: Node[]; edges?: Edge[] };
  getNodes: () => Node[];
  setNodes: (nodes: Node[]) => void;
  getEdges: () => Edge[];
  setEdges: (edges: Edge[]) => void;
}) => {
  const { nodes, edges } = elements;
  if (nodes) {
    setNodes(getNodes().filter((node) => !nodes.some((nodeToRemove) => nodeToRemove.id === node.id)));
  }

  if (edges) {
    setEdges(getEdges().filter((edge) => !edges.some((edgeToRemove) => edgeToRemove.id === edge.id)));
  }
};
