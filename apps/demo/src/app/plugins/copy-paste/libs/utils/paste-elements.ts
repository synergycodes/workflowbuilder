import type { Edge, Node } from '@xyflow/react';

import type { GetHandleId, Position } from '../types';
import { calculateNodePastePositionOffset } from './calculate-pasted-node-position';
import { addPoints } from './points';

/**
 * Utility to paste a selection of nodes and edges at a given position in the diagram.
 *
 * Handles ID remapping and edge handle updates. Optionally accepts a getHandleId function for custom edge handle logic.
 *
 * @param elements - Object containing nodes and edges to paste
 * @param mousePosition - Position where to paste the selection
 * @param getNodes - Function to get current nodes
 * @param setNodes - Function to set nodes
 * @param getEdges - Function to get current edges
 * @param setEdges - Function to set edges
 * @param generateId - Function to generate unique IDs
 * @param getHandleId - Function to get handle IDs for pasted elements
 * @returns void
 */
export const pasteElements = ({
  elements,
  mousePosition,
  getNodes,
  setNodes,
  getEdges,
  setEdges,
  generateId,
  getHandleId,
}: {
  elements: { nodes: Node[]; edges: Edge[] };
  mousePosition: Position;
  getNodes: () => Node[];
  setNodes: (nodes: Node[]) => void;
  getEdges: () => Edge[];
  setEdges: (edges: Edge[]) => void;
  generateId: () => string;
  getHandleId: GetHandleId;
}) => {
  const { nodes, edges } = elements;
  const mappedIds: Record<string, string> = {};

  if (nodes.length > 0) {
    const nodePasteOffset = calculateNodePastePositionOffset(nodes, mousePosition);

    const nodesToPaste = nodes.map((node) => {
      const newId = generateId();
      mappedIds[node.id] = newId;

      return {
        ...node,
        id: newId,
        position: addPoints(node.position, nodePasteOffset),
        selected: true,
      };
    });

    setNodes([...getNodes().map((node) => (node.selected ? { ...node, selected: false } : node)), ...nodesToPaste]);
  }

  if (edges.length > 0) {
    setEdges([
      ...getEdges().map((edge) => (edge.selected ? { ...edge, selected: false } : edge)),
      ...edges.map(({ source, target, sourceHandle = null, targetHandle = null, ...edge }) => ({
        ...edge,
        selected: true,
        sourceHandle: getHandleId
          ? getHandleId({
              type: 'source',
              newNodeId: mappedIds[source],
              oldNodeId: source,
              oldHandleId: sourceHandle,
            })
          : sourceHandle,
        targetHandle: getHandleId
          ? getHandleId({
              type: 'target',
              newNodeId: mappedIds[target],
              oldNodeId: target,
              oldHandleId: targetHandle,
            })
          : targetHandle,
        source: mappedIds[source] || source,
        target: mappedIds[target] || target,
        id: crypto.randomUUID(),
      })),
    ]);
  }
};
