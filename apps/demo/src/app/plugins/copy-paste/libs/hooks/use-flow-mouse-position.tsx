import { useReactFlow, useViewport } from '@xyflow/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { type FlowMousePosition, type Position } from '../types';

type UseGetFlowMousePositionOptions = {
  /** Custom selector to target flow container. Falls back to ".react-flow" */
  selector?: string;
};

/**
 * Hook to track mouse position within a react-flow diagram
 * Handles edge cases like zooming, panning, and flow container availability
 *
 * @param options - Configuration options for the hook
 * @param options.selector - Custom selector to target flow container
 * @returns MousePosition object containing coordinates in different reference systems
 */
export function useGetFlowMousePosition({ selector = '.react-flow' }: UseGetFlowMousePositionOptions = {}) {
  const { screenToFlowPosition } = useReactFlow();

  const viewport = useViewport();
  const flowContainerRef = useRef<Element | null>(null);

  // Check if a point is inside the flow container
  const isPointInsideFlow = useCallback((point: Position) => {
    if (!flowContainerRef.current) return false;

    const rect = flowContainerRef.current.getBoundingClientRect();

    return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
  }, []);

  const getMousePositionFromEvent = useCallback(
    <T extends { clientX: number; clientY: number }>(event: T) => {
      const screenPosition = { x: event.clientX, y: event.clientY };
      const isInside = isPointInsideFlow(screenPosition);

      const { zoom = 1, x: panX = 0, y: panY = 0 } = viewport;

      let diagramPosition = { x: 0, y: 0 };
      let flowPosition = { x: 0, y: 0 };

      if (flowContainerRef.current) {
        const rect = flowContainerRef.current.getBoundingClientRect();

        // Calculate diagram-relative position
        diagramPosition = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };

        if (isInside) {
          // Use the react-flow utility to get flow coordinates
          // This returns the virtual coordinates in the flow space
          flowPosition = screenToFlowPosition(screenPosition, {
            snapToGrid: false,
          });
        }
      }

      return {
        screen: screenPosition,
        diagram: diagramPosition,
        flow: flowPosition,
        isInsideFlow: isInside,
        zoom,
        pan: { x: panX, y: panY },
      };
    },
    [screenToFlowPosition, viewport, isPointInsideFlow],
  );

  // Attach the ref to the container on mount or selector change
  useLayoutEffect(() => {
    const container = document.querySelector(selector);
    if (container) {
      flowContainerRef.current = container;
    }
  }, [selector]);

  return { getMousePositionFromEvent, flowContainerRef };
}

type UseFlowMousePositionOptions = {
  selector?: string;
  enabled?: boolean;
};

export function useFlowMousePosition({ selector = '.react-flow', enabled = true }: UseFlowMousePositionOptions = {}) {
  const viewport = useViewport();

  const { getMousePositionFromEvent, flowContainerRef } = useGetFlowMousePosition({ selector });

  const isMounted = useRef<boolean>(false);
  const [mousePosition, setMousePosition] = useState<FlowMousePosition>({
    screen: { x: 0, y: 0 },
    diagram: { x: 0, y: 0 },
    flow: { x: 0, y: 0 },
    isInsideFlow: false,
    zoom: 1,
    pan: { x: 0, y: 0 },
  });

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      setMousePosition(getMousePositionFromEvent(event));
    },
    [getMousePositionFromEvent],
  );

  const handleMouseLeave = useCallback(() => {
    setMousePosition((previous) => ({
      ...previous,
      isInsideFlow: false,
    }));
  }, []);

  const handleMouseEnter = useCallback(() => {
    setMousePosition((previous) => ({
      ...previous,
      isInsideFlow: true,
    }));
  }, []);

  useLayoutEffect(() => {
    if (!enabled) return;

    if (flowContainerRef.current) {
      globalThis.addEventListener('mousemove', handleMouseMove, { passive: true });

      flowContainerRef.current.addEventListener('mouseenter', handleMouseEnter);
      flowContainerRef.current.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      isMounted.current = true;
      globalThis.removeEventListener('mousemove', handleMouseMove);

      if (flowContainerRef.current) {
        flowContainerRef.current.removeEventListener('mouseenter', handleMouseEnter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        flowContainerRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleMouseMove, handleMouseEnter, handleMouseLeave, selector, enabled]);

  useEffect(() => {
    if (!enabled) return;

    if (isMounted.current && mousePosition.isInsideFlow) {
      // Force a position update when viewport changes
      const event = new MouseEvent('mousemove', {
        clientX: mousePosition.screen.x,
        clientY: mousePosition.screen.y,
      });

      handleMouseMove(event);
    }
  }, [viewport, handleMouseMove, mousePosition.screen.x, mousePosition.screen.y, mousePosition.isInsideFlow, enabled]);

  return mousePosition;
}
