import { useStore } from '@workflowbuilder/sdk';
import { useEffect } from 'react';

const GRID_COLOR = '--wb-public-canvas-grid-color';

export function useReadOnlyHidesCanvasGrid() {
  const isReadOnly = useStore((state) => state.isReadOnly);

  // On the document root: AI Studio mounts one editor.
  useEffect(() => {
    if (!isReadOnly) return;

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty(GRID_COLOR, 'transparent');
    return () => {
      rootStyle.removeProperty(GRID_COLOR);
    };
  }, [isReadOnly]);
}
