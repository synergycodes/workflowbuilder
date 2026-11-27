import { useLayoutEffect, useRef } from 'react';

import type { OnSave } from '../../../types/integration';

type Params = { onSave: OnSave; autoSave: boolean; hasCrashed: () => boolean };

/**
 * Saves unsaved changes on unmount: a host SPA route change removes the editor without `beforeunload`.
 * Call it in `IntegrationContextWrapper`, as a layout effect: a descendant's cleanup, or a passive one,
 * runs after the session went inactive, when the save is already refused.
 */
export function useAutoSaveOnUnmount({ onSave, autoSave, hasCrashed }: Params) {
  // A ref, not a dep: a dep's change would run the cleanup and save without an unmount.
  const autoSaveRef = useRef(autoSave);

  useLayoutEffect(() => {
    autoSaveRef.current = autoSave;
  }, [autoSave]);

  useLayoutEffect(
    () => () => {
      if (!autoSaveRef.current || hasCrashed()) return;

      void onSave({ isAutoSave: true });
    },
    [onSave, hasCrashed],
  );
}
