import { useEffect } from 'react';

import { snackbarOffsetBottom } from '../utils/snackbar-offset';

const OFFSET_BOTTOM = '--wb-public-snackbar-offset-bottom';

// On the document root: the SDK's snackbar stack is not inside the dock, and AI Studio mounts one editor.
export function useSnackbarOffset(dock: HTMLElement | null) {
  useEffect(() => {
    if (!dock) return;

    const rootStyle = document.documentElement.style;
    const publish = () => {
      rootStyle.setProperty(
        OFFSET_BOTTOM,
        `${snackbarOffsetBottom(dock.getBoundingClientRect().top, window.innerHeight)}px`,
      );
    };

    publish();

    const observer = new ResizeObserver(publish);
    observer.observe(dock);
    // The offset's half-viewport cap moves with the window even when the dock keeps its size.
    window.addEventListener('resize', publish);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', publish);
      rootStyle.removeProperty(OFFSET_BOTTOM);
    };
  }, [dock]);
}
