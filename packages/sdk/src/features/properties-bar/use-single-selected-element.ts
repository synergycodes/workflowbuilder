import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../../node/node-data';
import { useStore } from '../../store/store';
import type { WorkflowEditorState } from '../../store/store';

export type SingleSelectedElement = {
  node: WorkflowBuilderNode | null;
  edge: WorkflowBuilderEdge | null;
};

export function selectSingleSelectedElement(store: WorkflowEditorState) {
  const totalSelected = store.selectedNodesIds.length + store.selectedEdgesIds.length;
  if (totalSelected !== 1) {
    return null;
  }

  const selectedNodeId = store.selectedNodesIds[0];
  const selectedEdgeId = store.selectedEdgesIds[0];

  return {
    node: store.nodes.find((x) => x?.id === selectedNodeId) ?? null,
    edge: store.edges.find((x) => x?.id === selectedEdgeId) ?? null,
  };
}

/**
 * Returns the currently-selected node + edge **only when exactly one
 * element is selected**, and `null` otherwise (zero selection or
 * multi-selection). Designed for the properties sidebar's "edit one thing
 * at a time" UI; the equality check tolerates stable references on
 * `node.data` / `edge.data` so the hook doesn't spam re-renders.
 *
 * @returns The selected element wrapped in `{ node, edge }` (each
 *   independently nullable), or `null` when selection isn't a single item.
 *
 * @category Hooks
 */
export function useSingleSelectedElement(): SingleSelectedElement | null {
  return useStore(selectSingleSelectedElement, areDataEqual);
}

function areDataEqual(previous: SingleSelectedElement | null, next: SingleSelectedElement | null): boolean {
  if (!next) {
    return false;
  }

  const hasSameNodeSelection = !!previous?.node === !!next?.node;
  const hasSameEdgeSelection = !!previous?.edge === !!next?.edge;
  const hasDifferentSelection = !hasSameNodeSelection || !hasSameEdgeSelection;

  if (hasDifferentSelection || !next) {
    return false;
  }

  if (previous?.node && next?.node) {
    const hasDifferentNodeData = !Object.is(previous.node.data, next.node.data);
    if (hasDifferentNodeData) {
      return false;
    }
  }

  if (previous?.edge && next?.edge) {
    const hasDifferentEdgeData = !Object.is(previous.edge.data, next.edge.data);
    if (hasDifferentEdgeData) {
      return false;
    }
  }

  return true;
}
