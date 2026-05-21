import { useEffect, useRef } from 'react';

/**
 * Like `useEffect`, but skips the **first** run — the callback fires only
 * when one of the dependencies actually changes after the initial render.
 *
 * Useful when you want to react to user-driven changes without firing on
 * the initial mount (e.g. saving form edits to the server, but not the
 * initial seeded values).
 *
 * @param callback - Effect to run on dependency changes (post-mount).
 * @param dependencies - Dependency array, identical semantics to `useEffect`.
 *
 * @category Hooks
 */
export function useEffectChange(callback: () => void, dependencies: unknown[]) {
  const isInited = useRef(false);

  useEffect(() => {
    if (!isInited.current) {
      isInited.current = true;

      return;
    }

    return callback();
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
}
