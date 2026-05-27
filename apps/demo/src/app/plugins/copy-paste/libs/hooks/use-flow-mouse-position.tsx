import { useReactFlow, useViewport } from '@xyflow/react';
import { useCallback, useLayoutEffect, useRef } from 'react';

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

const DEFAULT_FLOW_MOUSE_POSITION: FlowMousePosition = {
  screen: { x: 0, y: 0 },
  diagram: { x: 0, y: 0 },
  flow: { x: 0, y: 0 },
  isInsideFlow: false,
  zoom: 1,
  pan: { x: 0, y: 0 },
};

export type GetFlowMousePosition = () => FlowMousePosition;

export function useFlowMousePosition({
  selector = '.react-flow',
  enabled = true,
}: UseFlowMousePositionOptions = {}): GetFlowMousePosition {
  const { getMousePositionFromEvent } = useGetFlowMousePosition({ selector });

  // Track the pointer in a ref, not React state. Copy/paste only needs the
  // cursor position at paste time, so writing state on every mousemove would
  // re-render the host (CopyPasteProvider) on every frame of a drag for
  // nothing (WB-221).
  const lastPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      lastPointerRef.current = { clientX: event.clientX, clientY: event.clientY };
    };

    globalThis.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      globalThis.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enabled]);

  // Resolve on demand so a paste always uses the current viewport, without a
  // per-mousemove re-render.
  return useCallback(() => {
    if (!lastPointerRef.current) {
      return DEFAULT_FLOW_MOUSE_POSITION;
    }

    return getMousePositionFromEvent(lastPointerRef.current);
  }, [getMousePositionFromEvent]);
}
