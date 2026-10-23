import type { FitViewOptions } from '@xyflow/react';
import { useCallback } from 'react';

import { FIT_VIEW_BASE_PADDING, FIT_VIEW_DURATION_TIME, FIT_VIEW_MAX_ZOOM } from '../features/diagram/diagram.const';
import { useStore } from '../store/store';

/**
 * Returns a callback that animates the diagram view to fit all nodes,
 * accounting for the editor's app bar / palette / property panel bounds.
 *
 * Common triggers: after auto-layout, after loading a new diagram,
 * after a "fit view" toolbar button click. Uses a single
 * `requestAnimationFrame` so the call is safe to issue from a render path.
 *
 * @returns A `() => void` callback. Stable across renders unless the
 *   ReactFlow instance changes.
 *
 * @category Hooks
 */
export function useFitView() {
  const reactFlowInstance = useStore((store) => store.reactFlowInstance);

  const fitView = useCallback(() => {
    requestAnimationFrame(() => {
      const scale = reactFlowInstance?.getZoom() ?? 1;
      const padding = getPadding(scale, document.querySelector<HTMLElement>('.react-flow'));

      if (reactFlowInstance) {
        reactFlowInstance.fitView({
          duration: FIT_VIEW_DURATION_TIME,
          maxZoom: FIT_VIEW_MAX_ZOOM,
          padding,
        });
      }
    });
  }, [reactFlowInstance]);

  return fitView;
}

export function getPadding(scale: number, canvas: HTMLElement | null): FitViewOptions['padding'] {
  const viewportRect = document.querySelector('#viewport-bounds')?.getBoundingClientRect();
  const canvasRect = canvas?.getBoundingClientRect();

  if (!viewportRect || !canvasRect) return `${FIT_VIEW_BASE_PADDING}px`;

  const basePadding = FIT_VIEW_BASE_PADDING * scale;
  return {
    left: `${viewportRect.left - canvasRect.left + basePadding}px`,
    top: `${viewportRect.top - canvasRect.top + basePadding}px`,
    right: `${canvasRect.right - viewportRect.right + basePadding}px`,
    bottom: `${canvasRect.bottom - viewportRect.bottom + basePadding}px`,
  };
}
