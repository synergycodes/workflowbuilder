import { WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflow-builder/types/node-data';

import useStore from '@/store/store';
import { WorkflowEditorState } from '@/store/store';

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
 * Hook that returns the first selected element (node or edge) ONLY when exactly one element is selected.
 * This hook is specifically designed for the properties sidebar to display and edit properties
 * of a single selected element. It ensures that any changes to the selected node or edge data are reflected in the properties sidebar.
 * It returns null when multiple elements are selected or no elements are selected.
 *
 * @returns {SingleSelectedElement | null} The selected element or null if multiple elements are selected
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
