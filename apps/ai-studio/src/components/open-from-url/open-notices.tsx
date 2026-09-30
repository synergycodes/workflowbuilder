import { type ShowSnackbarOptions, showSnackbar } from '@workflowbuilder/sdk';
import { useEffect } from 'react';

import { type Notice, takeNotices, useDiagramSourceStore } from '../../stores/use-diagram-source-store';

function snackbarOf({ text, variant }: Notice): ShowSnackbarOptions {
  // A success goes after the SDK's default time; anything to act on stays until closed.
  return variant === 'success' ? { variant, title: text } : { variant, title: text, autoHideDuration: null };
}

/** Hands the notices to the editor's snackbars, which show nothing until the editor has mounted. */
export function OpenNotices() {
  const pendingCount = useDiagramSourceStore((state) => state.notices.length);

  useEffect(() => {
    for (const notice of takeNotices()) {
      showSnackbar(snackbarOf(notice));
    }
  }, [pendingCount]);

  return null;
}
