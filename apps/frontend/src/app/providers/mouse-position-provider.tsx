import { createContext, useEffect, useRef } from 'react';
import { funnel } from 'remeda';
import { ChildrenProps, Point } from '@workflow-builder/types/common';

const expectedFrameTimeInMs = 16;

type MousePosition = {
  getCurrentMousePosition: () => Point;
};

export const MousePositionContext = createContext<MousePosition>({
  getCurrentMousePosition: () => ({ x: 0, y: 0 }),
});

export function MousePositionProvider({ children }: ChildrenProps) {
  const mousePositionRef = useRef<Point>({ x: 0, y: 0 });

  useEffect(() => {
    const updateMousePosition = funnel(
      // @ts-expect-error Wrong typing in remeda, this comment will raise an error after it gets fixed with next versions
      (event_: MouseEvent) => {
        mousePositionRef.current = { x: event_.clientX, y: event_.clientY };
      },
      {
        minGapMs: expectedFrameTimeInMs,
        triggerAt: 'start',
        reducer: (_, event) => event,
      },
    );

    globalThis.addEventListener('mousemove', updateMousePosition.call);
    return () => {
      globalThis.removeEventListener('mousemove', updateMousePosition.call);
    };
  }, []);

  function getCurrentMousePosition() {
    return mousePositionRef.current;
  }

  return <MousePositionContext.Provider value={{ getCurrentMousePosition }}>{children}</MousePositionContext.Provider>;
}
