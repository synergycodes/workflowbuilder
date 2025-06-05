import { useCallback } from 'react';
import useStore from '@/store/store';
import { FIT_VIEW_DURATION_TIME, FIT_VIEW_MAX_ZOOM, FIT_VIEW_PADDING } from '@/features/diagram/diagram.const';

export function useFitView() {
  const reactFlowInstance = useStore((store) => store.reactFlowInstance);

  const fitView = useCallback(() => {
    requestAnimationFrame(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({
          duration: FIT_VIEW_DURATION_TIME,
          maxZoom: FIT_VIEW_MAX_ZOOM,
          padding: FIT_VIEW_PADDING,
        });
      }
    });
  }, [reactFlowInstance]);

  return fitView;
}
