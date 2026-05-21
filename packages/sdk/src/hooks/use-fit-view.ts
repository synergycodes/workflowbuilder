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
      const padding = getPadding(scale);

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

function getPadding(scale: number) {
  const viewportBounds = document.querySelector('#viewport-bounds');
  const viewportRect = viewportBounds?.getBoundingClientRect();

  const padding: FitViewOptions['padding'] = viewportRect
    ? {
        left: `${viewportRect.left + FIT_VIEW_BASE_PADDING * scale}px`,
        top: `${viewportRect.top + FIT_VIEW_BASE_PADDING * scale}px`,
        right: `${window.innerWidth - viewportRect.right + FIT_VIEW_BASE_PADDING * scale}px`,
        bottom: `${window.innerHeight - viewportRect.bottom + FIT_VIEW_BASE_PADDING * scale}px`,
      }
    : `${FIT_VIEW_BASE_PADDING}px`;

  return padding;
}
