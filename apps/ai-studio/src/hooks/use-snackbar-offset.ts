import { useEffect } from 'react';

import { snackbarOffsetBottom } from '../utils/snackbar-offset';

const SNACKBAR_OFFSET_VARIABLE = '--wb-public-snackbar-offset-bottom';

// A rule on the root class, not an inline style on <html>: the SDK sets the default on the popup
// container that holds the snackbars, so only a rule matching that element overrides it.
export function useSnackbarOffset(dock: HTMLElement | null) {
  useEffect(() => {
    if (!dock) return;

    const style = document.createElement('style');
    style.dataset['aiStudioSnackbarOffset'] = '';
    document.head.append(style);

    const syncOffset = () => {
      const offset = snackbarOffsetBottom(dock.getBoundingClientRect().top, window.innerHeight);
      style.textContent = `.workflow-builder-root { ${SNACKBAR_OFFSET_VARIABLE}: ${offset}px; }`;
    };

    syncOffset();

    // The dock is fixed to the viewport bottom, so its top moves only when its own height changes.
    const observer = new ResizeObserver(syncOffset);
    observer.observe(dock);

    return () => {
      observer.disconnect();
      style.remove();
    };
  }, [dock]);
}
