import { type EdgeSelectionChange, type NodeSelectionChange, useStoreApi } from '@xyflow/react';
import { useCallback } from 'react';

import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../node/node-data';

/**
 * The nodes and edges {@link useSetSelection} selects, by id. Either list may be left out.
 *
 * @category Hooks
 */
export type SelectionIds = { nodeIds?: readonly string[]; edgeIds?: readonly string[] };

/**
 * Returns a function that replaces the selection with the given nodes and edges, as a click does
 * for one element: a group's selection box goes too, and a held multi-selection key changes
 * nothing. An empty call clears the selection. It returns `false` and changes nothing when the
 * canvas lacks any of the ids. Stable across renders.
 *
 * The canvas learns of a node on its next render, so a node added in the same tick counts as
 * missing; give it `selected: true` as you add it instead. Unlike a click, it also selects an
 * element the person cannot select, such as one with `selectable: false`.
 *
 * Use it for a control outside the canvas that leads to an element, such as a notification's
 * button. Must be called from a descendant of `<WorkflowBuilder.Root>`, which holds the canvas's
 * React Flow store.
 *
 * @example
 * ```tsx
 * function GoToNode({ nodeId }: { nodeId: string }) {
 *   const setSelection = useSetSelection();
 *   return <button onClick={() => setSelection({ nodeIds: [nodeId] })}>Show</button>;
 * }
 * ```
 *
 * @category Hooks
 */
export function useSetSelection(): (selection: SelectionIds) => boolean {
  const store = useStoreApi<WorkflowBuilderNode, WorkflowBuilderEdge>();

  return useCallback(
    ({ nodeIds = [], edgeIds = [] }: SelectionIds) => {
      const { nodeLookup, edgeLookup, unselectNodesAndEdges, triggerNodeChanges, triggerEdgeChanges } =
        store.getState();
      if (!nodeIds.every((id) => nodeLookup.has(id)) || !edgeIds.every((id) => edgeLookup.has(id))) return false;

      // A click drops a group's selection box first; without it the box would stay around what is selected now.
      store.setState({ nodesSelectionActive: false });
      // React Flow unselects everything itself, keeping its own lookup in step; only then are the given ids selected.
      // Nothing here reads `selected`, so a second call in the same tick cannot work from stale state.
      unselectNodesAndEdges();
      triggerNodeChanges(nodeIds.map(selectChange));
      triggerEdgeChanges(edgeIds.map(selectChange));
      return true;
    },
    [store],
  );
}

function selectChange(id: string): NodeSelectionChange & EdgeSelectionChange {
  return { id, type: 'select', selected: true };
}
