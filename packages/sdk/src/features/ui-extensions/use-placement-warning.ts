import { useEffect, useRef } from 'react';

/**
 * Warns once per mounted instance while `condition` holds. Deliberately not gated on
 * `import.meta.env.DEV`: the build inlines that flag, so a gate would hide the warning from the
 * consumers it addresses.
 */
export function usePlacementWarning(condition: boolean, message: string): void {
  const hasWarned = useRef(false);

  useEffect(() => {
    if (!condition || hasWarned.current) return;
    hasWarned.current = true;
    console.warn(message);
  }, [condition, message]);
}
