import { useEffect } from 'react';

import { snackbarOffsetBottom } from '../utils/snackbar-offset';

const SNACKBAR_OFFSET_VARIABLE = '--wb-public-snackbar-offset-bottom';

// On the document root: the SDK's snackbar stack is not inside the dock, and AI Studio mounts one editor.
export function useSnackbarOffset(dock: HTMLElement | null) {
  useEffect(() => {
    if (!dock) return;

    const rootStyle = document.documentElement.style;
    const syncOffset = () => {
      rootStyle.setProperty(
        SNACKBAR_OFFSET_VARIABLE,
        `${snackbarOffsetBottom(dock.getBoundingClientRect().top, window.innerHeight)}px`,
      );
    };

    syncOffset();

    // The dock is fixed to the viewport bottom, so its top moves only when its own height changes.
    const observer = new ResizeObserver(syncOffset);
    observer.observe(dock);

    return () => {
      observer.disconnect();
      rootStyle.removeProperty(SNACKBAR_OFFSET_VARIABLE);
    };
  }, [dock]);
}
