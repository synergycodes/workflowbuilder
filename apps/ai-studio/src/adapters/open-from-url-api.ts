import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflowbuilder/sdk';

import type { GetExecutionSnapshotResponse, WorkflowRecord } from '@workflow-builder/types/workflow-execution/api';

import { BACKEND_URL } from '../config';
import { isPlainObject } from '../utils/is-plain-object';
import type { FetchResult } from '../utils/open-from-url/resolve-diagram-source';

async function requestJson<T>(
  path: string,
  hasShape: (body: Record<string, unknown>) => boolean,
  init?: RequestInit,
): Promise<FetchResult<T>> {
  let response: Response;
  try {
    response = await (init === undefined ? fetch(`${BACKEND_URL}${path}`) : fetch(`${BACKEND_URL}${path}`, init));
  } catch {
    return { ok: false, status: 'network' };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, status: response.ok ? 'unparsable' : response.status };
  }

  if (!response.ok) {
    const code = isPlainObject(body) && typeof body['code'] === 'string' ? body['code'] : undefined;
    return code === undefined ? { ok: false, status: response.status } : { ok: false, status: response.status, code };
  }
  // A proxy can answer 200 with a body of its own.
  return isPlainObject(body) && hasShape(body) ? { ok: true, data: body as T } : { ok: false, status: 'unparsable' };
}

const hasName = (body: Record<string, unknown>) => typeof body['name'] === 'string';

export function fetchWorkflow(workflowId: string): Promise<FetchResult<WorkflowRecord>> {
  return requestJson(`/api/workflows/${workflowId}`, hasName);
}

export function fetchExecutionSnapshot(executionId: string): Promise<FetchResult<GetExecutionSnapshotResponse>> {
  return requestJson(`/api/executions/${executionId}/snapshot`, (body) => typeof body['workflowId'] === 'string');
}

export function saveWorkflowDraft(
  workflowId: string,
  draft: { nodes: WorkflowBuilderNode[]; edges: WorkflowBuilderEdge[] },
): Promise<FetchResult<WorkflowRecord>> {
  return requestJson(`/api/workflows/${workflowId}/draft`, hasName, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draftJson: draft }),
  });
}
