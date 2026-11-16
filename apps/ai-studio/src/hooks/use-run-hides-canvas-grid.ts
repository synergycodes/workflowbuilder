import { useChangesTrackerStore } from '@workflowbuilder/sdk';
import { useEffect } from 'react';

import { markCanvasEditedAfterRun, useExecutionStore } from '../stores/use-execution-store';
import { isCanvasEdit } from '../utils/canvas-edit';

const GRID_COLOR = '--wb-public-canvas-grid-color';

export function useRunHidesCanvasGrid() {
  const isGridHidden = useExecutionStore((state) => state.executionId !== undefined && !state.isCanvasEditedAfterRun);

  // A listener, not a selector: an edit named like the change before it would leave a selected name equal.
  useEffect(
    () =>
      useChangesTrackerStore.subscribe((state) => {
        if (isCanvasEdit(state.lastChangeName)) markCanvasEditedAfterRun();
      }),
    [],
  );

  // On the document root: AI Studio mounts one editor.
  useEffect(() => {
    if (!isGridHidden) return;

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty(GRID_COLOR, 'transparent');
    return () => {
      rootStyle.removeProperty(GRID_COLOR);
    };
  }, [isGridHidden]);
}
