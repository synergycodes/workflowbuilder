import { useSetSelection, useStore } from '@workflowbuilder/sdk';
import { useStoreApi } from '@xyflow/react';
import { useEffect, useRef } from 'react';

import { useExecutionStore } from '../stores/use-execution-store';

type PanelsBeforeRun = { isSidebarExpanded: boolean; nodeIds: string[]; edgeIds: string[] };

/**
 * A run collapses the node library and the properties panel once, when it starts; Reset brings back only a panel
 * still collapsed, so what the person opened during the run stays open.
 * The properties panel collapses by losing the selection: the SDK keeps its open state to itself.
 */
export function useRunCollapsesSidePanels() {
  const executionId = useExecutionStore((state) => state.executionId);
  const canvas = useStoreApi();
  const setSelection = useSetSelection();
  const beforeRunRef = useRef<PanelsBeforeRun | undefined>(undefined);

  useEffect(() => {
    const { nodes, edges, nodeLookup, edgeLookup } = canvas.getState();
    const { isSidebarExpanded, toggleSidebar } = useStore.getState();

    if (executionId === undefined) {
      const before = beforeRunRef.current;
      if (!before) return;
      beforeRunRef.current = undefined;
      if (!isSidebarExpanded) toggleSidebar(before.isSidebarExpanded);
      if (!nodes.some(isSelected) && !edges.some(isSelected)) {
        setSelection({
          nodeIds: before.nodeIds.filter((id) => nodeLookup.has(id)),
          edgeIds: before.edgeIds.filter((id) => edgeLookup.has(id)),
        });
      }
      return;
    }

    // Kept from the first run: a second Run before Reset would remember the panels already collapsed.
    if (!beforeRunRef.current) {
      beforeRunRef.current = {
        isSidebarExpanded,
        nodeIds: nodes.filter(isSelected).map(({ id }) => id),
        edgeIds: edges.filter(isSelected).map(({ id }) => id),
      };
    }
    toggleSidebar(false);
    setSelection({});
  }, [executionId, canvas, setSelection]);
}

function isSelected(element: { selected?: boolean }): boolean {
  return !!element.selected;
}
