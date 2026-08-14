import { RefObject, useEffect } from 'react';

type TransitionEventType = 'transitionstart' | 'transitionrun' | 'transitionend';

export function useTransitionEvent(
  ref: RefObject<HTMLElement | null>,
  type: TransitionEventType,
  propertyName: string,
  callback: () => void,
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const handler = (event: TransitionEvent) => {
      if (event.propertyName === propertyName) {
        callback();
      }
    };

    element.addEventListener(type, handler);
    return () => element.removeEventListener(type, handler);
  }, [ref, type, propertyName, callback]);
}
