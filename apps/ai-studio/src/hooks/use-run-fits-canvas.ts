import { useFitView, useStore } from '@workflowbuilder/sdk';
import { useEffect, useRef } from 'react';

import { useExecutionStore } from '../stores/use-execution-store';

type PanelsBeforeRun = { isPaletteOpen: boolean; isPropertiesPanelOpen: boolean };

/**
 * A run collapses the node library and the properties panel once, when it starts, and fits the diagram into the room
 * they leave; Reset brings back only a panel still collapsed, so what the person opened during the run stays open.
 * The selection stays as it is.
 */
export function useRunFitsCanvas() {
  const executionId = useExecutionStore((state) => state.executionId);
  const fitView = useFitView();
  const beforeRunRef = useRef<PanelsBeforeRun | undefined>(undefined);

  useEffect(() => {
    const { isPaletteOpen, isPropertiesPanelOpen, setPaletteOpen, setPropertiesPanelOpen } = useStore.getState();

    if (executionId === undefined) {
      const before = beforeRunRef.current;
      if (!before) return;
      beforeRunRef.current = undefined;
      if (!isPaletteOpen) setPaletteOpen(before.isPaletteOpen);
      if (!isPropertiesPanelOpen) setPropertiesPanelOpen(before.isPropertiesPanelOpen);
      return;
    }

    // Kept from the first run: a second Run before Reset would remember the panels already collapsed.
    beforeRunRef.current ??= { isPaletteOpen, isPropertiesPanelOpen };
    setPaletteOpen(false);
    setPropertiesPanelOpen(false);
  }, [executionId]);

  // After the effect above, so the fit measures the canvas without the panels. The callback changes with the React
  // Flow instance, which a run opened from its address can wait for.
  useEffect(() => {
    if (executionId !== undefined) fitView();
  }, [executionId, fitView]);
}
