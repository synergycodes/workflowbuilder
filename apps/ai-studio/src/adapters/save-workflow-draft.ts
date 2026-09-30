import type { DidSaveStatus, OnSaveExternal, OnSaveParams } from '@workflowbuilder/sdk';

import { BACKEND_URL } from '../config';
import { addNotice } from '../stores/use-notices-store';

// Browsers refuse a keepalive request whose body reaches 64 KiB. A larger draft goes without it: it still
// saves while the page is up, and on close the last autosave stands.
const KEEPALIVE_BODY_LIMIT = 64 * 1024;

/** The editor's save callback for the link's workflow: Save, autosave and the save on close all land here. */
export function saveDraftOf(workflowId: string): OnSaveExternal {
  return async ({ nodes, edges }, params) => {
    const body = JSON.stringify({ draftJson: { nodes, edges } });
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
    return response.ok ? 'success' : failed(params, `the server answered ${response.status}`);
  };
}

// The SDK shows nothing for a failed autosave; a manual Save gets its own error snackbar.
function failed(params: OnSaveParams | undefined, reason: string): DidSaveStatus {
  if (params?.isAutoSave) {
    addNotice(`The workflow draft could not be saved automatically: ${reason}.`, 'error');
  }

  return 'error';
}
