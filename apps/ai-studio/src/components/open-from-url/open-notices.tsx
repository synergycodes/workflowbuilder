import { type ShowSnackbarOptions, showSnackbar } from '@workflowbuilder/sdk';
import { useEffect } from 'react';

import { type Notice, takeNotices, useNoticesStore } from '../../stores/use-notices-store';

function snackbarOf({ text, variant }: Notice): ShowSnackbarOptions {
  // A success goes after the SDK's default time; anything to act on stays until closed, keyed by its text because
  // a failing autosave repeats on every edit.
  return variant === 'success' ? { variant, title: text } : { key: text, variant, title: text, autoHideDuration: null };
}

/** Hands the notices to the editor's snackbars, which show nothing until the editor has mounted. */
export function OpenNotices() {
  const pendingCount = useNoticesStore((state) => state.notices.length);

  useEffect(() => {
    for (const notice of takeNotices()) {
      showSnackbar(snackbarOf(notice));
    }
  }, [pendingCount]);

  return null;
}
