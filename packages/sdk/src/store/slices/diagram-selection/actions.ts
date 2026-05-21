// About actions: apps/demo/src/app/store/README.md
import type { OnSelectionChangeParams } from '@xyflow/react';

import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../../../node/node-data';
import { useStore } from '../../store';

/**
 * Snapshot of the currently-selected nodes + edges, in xyflow's
 * `OnSelectionChangeParams` shape. Useful from outside React when you
 * need to act on selection — e.g. on toolbar-button click to reach for
 * the selected items.
 *
 * @category Store
 */
export function getStoreSelection(): OnSelectionChangeParams {
  const state = useStore.getState();

  const selectedNodes = state.selectedNodesIds
    .map((nodeId) => state.nodes.find(({ id }) => id === nodeId))
    .filter((value): value is WorkflowBuilderNode => !!value);

  const selectedEdges = state.selectedEdgesIds
    .map((edgeId) => state.edges.find(({ id }) => id === edgeId))
    .filter((value): value is WorkflowBuilderEdge => !!value);

  return {
    nodes: selectedNodes,
    edges: selectedEdges,
  };
}

/**
 * Clear all node + edge selection. The diagram updates to the
 * unselected visual state on next render.
 *
 * @category Store
 */
export function resetStoreSelection() {
  useStore.setState({
    selectedNodesIds: [],
    selectedEdgesIds: [],
  });
}
