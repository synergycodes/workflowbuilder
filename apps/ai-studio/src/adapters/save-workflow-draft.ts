import { type OnSaveExternal, type OnSaveParams, useChangesTrackerStore } from '@workflowbuilder/sdk';

import { BACKEND_URL } from '../config';
import { addNotice } from '../stores/use-notices-store';

// Browsers refuse a keepalive request whose body reaches 64 KiB. A larger draft goes without it: it still
// saves while the page is up, and on close the last autosave stands.
const KEEPALIVE_BODY_LIMIT = 64 * 1024;

/** The editor's save callback for the link's workflow: Save, autosave and the save on close all land here. */
export function saveDraftOf(workflowId: string): OnSaveExternal {
  const openedAt = Date.now();
  let savedBody: string | undefined;

  // The SDK also autosaves on close with nothing edited, which would overwrite newer edits made elsewhere.
  // Until the first save, only a change the SDK tracks counts as an edit.
  const isUnchanged = (body: string) =>
    savedBody === undefined ? useChangesTrackerStore.getState().lastChangeTimestamp <= openedAt : body === savedBody;

  return async ({ nodes, edges }, params) => {
    const body = JSON.stringify({ draftJson: { nodes, edges } });
    if (params?.isAutoSave && isUnchanged(body)) {
      return 'success';
    }

    let response: Response;
    try {
      response = await fetch(`${BACKEND_URL}/api/workflows/${workflowId}/draft`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: new TextEncoder().encode(body).byteLength < KEEPALIVE_BODY_LIMIT,
      });
    } catch {
      return failed(params, 'the server did not answer');
    }
    if (!response.ok) {
      return failed(params, `the server answered ${response.status}`);
    }

    savedBody = body;
    return 'success';
  };
}

// The SDK's props wrapper takes any resolved value, 'error' included, for a finished save, so a failure throws.
// It shows nothing for a failed autosave; a manual Save gets its own error snackbar.
function failed(params: OnSaveParams | undefined, reason: string): never {
  if (params?.isAutoSave) {
    addNotice(`The workflow draft could not be saved automatically: ${reason}.`, 'error');
  }

  throw new Error(`The workflow draft could not be saved: ${reason}.`);
}
