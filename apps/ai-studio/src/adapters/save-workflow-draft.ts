import type { OnSaveExternal, OnSaveParams } from '@workflowbuilder/sdk';

import { BACKEND_URL } from '../config';
import { addNotice } from '../stores/use-notices-store';

// Browsers refuse a keepalive request whose body reaches 64 KiB. A larger draft goes without it: it still
// saves while the page is up, and on close the last autosave stands.
const KEEPALIVE_BODY_LIMIT = 64 * 1024;

let isHalted = false;

/**
 * After a crash the store holds what would not draw, and the SDK's autosave timer outlives the editor.
 * Once the SDK clears that timer on unmount, this goes (follow-up: sdk-autosave-timer-unmount).
 */
export function haltSaves(): void {
  isHalted = true;
}

/** Writes a workflow's draft. The editor's saves and Run both come here. */
export function patchDraft(workflowId: string, nodes: unknown[], edges: unknown[]): Promise<Response> {
  const body = JSON.stringify({ draftJson: { nodes, edges } });
  return fetch(`${BACKEND_URL}/api/workflows/${workflowId}/draft`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: new TextEncoder().encode(body).byteLength < KEEPALIVE_BODY_LIMIT,
  });
}

/** The editor's save callback for the link's workflow: Save, autosave and the save on close all land here. */
export function saveDraftOf(workflowId: string): OnSaveExternal {
  return async ({ nodes, edges }, params) => {
    if (isHalted) {
      throw new Error('The editor stopped after a crash, so nothing is saved.');
    }

    let response: Response;
    try {
      response = await patchDraft(workflowId, nodes, edges);
    } catch {
      return failed(params, 'the server did not answer');
    }
    if (!response.ok) {
      return failed(params, `the server answered ${response.status}`);
    }

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
