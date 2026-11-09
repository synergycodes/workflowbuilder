import type { FitViewOptions } from '@xyflow/react';
import { useCallback } from 'react';

import { FIT_VIEW_BASE_PADDING, FIT_VIEW_DURATION_TIME, FIT_VIEW_MAX_ZOOM } from '../features/diagram/diagram.const';
import type { WorkflowBuilderReactFlowInstance } from '../node/common';
import { useStore } from '../store/store';

/**
 * Returns a callback that animates the diagram view to fit all nodes,
 * accounting for the editor header, palette and properties panel bounds.
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

  const fitView = useCallback(() => fitDiagramView(reactFlowInstance), [reactFlowInstance]);

  return fitView;
}

export function fitDiagramView(reactFlowInstance: WorkflowBuilderReactFlowInstance | null) {
  requestAnimationFrame(() => {
    const scale = reactFlowInstance?.getZoom() ?? 1;
    // One editor per page; scoped to it because the host page can have its own React Flow canvas.
    const padding = getPadding(scale, document.querySelector('.workflow-builder-root-shell') ?? document);

    if (reactFlowInstance) {
      reactFlowInstance.fitView({
        duration: FIT_VIEW_DURATION_TIME,
        maxZoom: FIT_VIEW_MAX_ZOOM,
        padding,
      });
    }
  });
}

export function getPadding(scale: number, editor: ParentNode): FitViewOptions['padding'] {
  const viewportRect = editor.querySelector('#viewport-bounds')?.getBoundingClientRect();
  const canvasRect = editor.querySelector('.react-flow')?.getBoundingClientRect();

  if (!viewportRect || !canvasRect) return `${FIT_VIEW_BASE_PADDING}px`;

  const basePadding = FIT_VIEW_BASE_PADDING * scale;
  return {
    left: `${viewportRect.left - canvasRect.left + basePadding}px`,
    top: `${viewportRect.top - canvasRect.top + basePadding}px`,
    right: `${canvasRect.right - viewportRect.right + basePadding}px`,
    bottom: `${canvasRect.bottom - viewportRect.bottom + basePadding}px`,
  };
}
