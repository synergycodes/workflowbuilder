import useStore from '@/store/store';
import { WorkflowBuilderNode, WorkflowBuilderEdge } from 'apps/types/src/node-data';
import { WorkflowEditorState } from '@/store/store';

export type SingleSelectedElement = {
  node: WorkflowBuilderNode | null;
  edge: WorkflowBuilderEdge | null;
};

/**
 * Hook that returns the first selected element (node or edge) ONLY when exactly one element is selected.
 * This hook is specifically designed for the properties sidebar to display and edit properties
 * of a single selected element. It ensures that any changes to the selected node or edge data are reflected in the properties sidebar.
 * It returns null when multiple elements are selected or no elements are selected.
 *
 * @returns {SingleSelectedElement | null} The selected element or null if multiple elements are selected
 */
export function useSingleSelectedElement(): SingleSelectedElement | null {
  return useStore((state: WorkflowEditorState) => {
    const totalSelected = state.selectedNodesIds.length + state.selectedEdgesIds.length;
    if (totalSelected !== 1) {
      return null;
    }

    const selectedNodeId = state.selectedNodesIds[0];
    const selectedEdgeId = state.selectedEdgesIds[0];

    return {
      node: state.nodes.find((x) => x?.id === selectedNodeId) ?? null,
      edge: state.edges.find((x) => x?.id === selectedEdgeId) ?? null,
    };
  }, areDataEqual);
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
