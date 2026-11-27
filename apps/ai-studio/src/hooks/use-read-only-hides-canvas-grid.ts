import { useStore } from '@workflowbuilder/sdk';
import { useEffect } from 'react';

const GRID_COLOR = '--wb-public-canvas-grid-color';

export function useReadOnlyHidesCanvasGrid() {
  const isReadOnly = useStore((state) => state.isReadOnly);

  // A rule on the root class, not an inline style on <html>: the editor sets the default on its own
  // element, so a value on <html> never reaches the canvas.
  useEffect(() => {
    if (!isReadOnly) return;

    const style = document.createElement('style');
    style.dataset['aiStudioCanvasGrid'] = '';
    style.textContent = `.workflow-builder-root { ${GRID_COLOR}: transparent; }`;
    document.head.append(style);
    return () => style.remove();
  }, [isReadOnly]);
}
