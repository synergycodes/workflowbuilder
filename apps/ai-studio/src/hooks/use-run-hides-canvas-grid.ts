import { useEffect } from 'react';

import { useExecutionStore } from '../stores/use-execution-store';

const GRID_COLOR = '--wb-public-canvas-grid-color';

/** From the moment the backend starts a run until Reset the canvas shows no grid. */
export function useRunHidesCanvasGrid() {
  const executionId = useExecutionStore((state) => state.executionId);

  // On the document root: AI Studio mounts one editor.
  useEffect(() => {
    if (executionId === undefined) return;

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty(GRID_COLOR, 'transparent');
    return () => {
      rootStyle.removeProperty(GRID_COLOR);
    };
  }, [executionId]);
}
