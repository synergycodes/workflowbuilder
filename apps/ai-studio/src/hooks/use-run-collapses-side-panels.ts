import { getStoreSelection, useSetSelection, useStore } from '@workflowbuilder/sdk';
import { useEffect, useRef } from 'react';

import { useExecutionStore } from '../stores/use-execution-store';

type PanelsBeforeRun = { isPaletteOpen: boolean; nodeIds: string[]; edgeIds: string[] };

/**
 * A run collapses the node library and the properties panel once, when it starts; Reset brings both back.
 * The properties panel collapses by losing the selection: it only shows while something is selected.
 */
export function useRunCollapsesSidePanels() {
  const executionId = useExecutionStore((state) => state.executionId);
  const setSelection = useSetSelection();
  const beforeRunRef = useRef<PanelsBeforeRun | undefined>(undefined);

  useEffect(() => {
    if (executionId === undefined) {
      const before = beforeRunRef.current;
      if (!before) return;
      beforeRunRef.current = undefined;
      useStore.getState().setPaletteOpen(before.isPaletteOpen);
      setSelection({ nodeIds: before.nodeIds, edgeIds: before.edgeIds });
      return;
    }

    // Kept from the first run: a second Run before Reset would remember the panels already collapsed.
    if (!beforeRunRef.current) {
      const { nodes, edges } = getStoreSelection();
      beforeRunRef.current = {
        isPaletteOpen: useStore.getState().isPaletteOpen,
        nodeIds: nodes.map((node) => node.id),
        edgeIds: edges.map((edge) => edge.id),
      };
    }
    useStore.getState().setPaletteOpen(false);
    setSelection({});
  }, [executionId, setSelection]);
}
