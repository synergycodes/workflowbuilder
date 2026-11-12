import { useStore } from '@workflowbuilder/sdk';
import { useEffect, useRef } from 'react';

import { useExecutionStore } from '../stores/use-execution-store';

type PanelsBeforeRun = { isPaletteOpen: boolean; isPropertiesPanelOpen: boolean };

/**
 * A run collapses the node library and the properties panel once, when it starts; Reset brings back only a panel
 * still collapsed, so what the person opened during the run stays open. The selection stays as it is.
 */
export function useRunCollapsesSidePanels() {
  const executionId = useExecutionStore((state) => state.executionId);
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
}
