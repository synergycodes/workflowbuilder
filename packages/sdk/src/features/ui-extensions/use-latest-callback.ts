import { type RefObject, useLayoutEffect, useRef, useState } from 'react';

// Built outside the hook, so the stable function holds only the ref, not the first render's scope.
function forwardTo<A extends unknown[], R>(latest: RefObject<(...parameters: A) => R>) {
  return (...parameters: A) => latest.current(...parameters);
}

/** A function that keeps its identity for the component's lifetime and always calls the latest `callback`. */
export function useLatestCallback<A extends unknown[], R>(callback: (...parameters: A) => R): (...parameters: A) => R {
  const latest = useRef(callback);
  useLayoutEffect(() => {
    latest.current = callback;
  });

  const [stable] = useState(() => forwardTo(latest));
  return stable;
}
