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

    const observer = new ResizeObserver(syncOffset);
    observer.observe(dock);
    // The offset's half-viewport cap moves with the window even when the dock keeps its size.
    window.addEventListener('resize', syncOffset);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncOffset);
      rootStyle.removeProperty(SNACKBAR_OFFSET_VARIABLE);
    };
  }, [dock]);
}
