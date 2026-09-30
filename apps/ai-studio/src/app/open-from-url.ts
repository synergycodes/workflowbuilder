import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflowbuilder/sdk';

import type { GetExecutionSnapshotResponse, WorkflowRecord } from '@workflow-builder/types/workflow-execution/api';

import { BACKEND_URL } from '../config';
import { setExecutionStarted } from '../stores/use-execution-store';
import { OpenError } from './open-error';

export type Diagram = { nodes: WorkflowBuilderNode[]; edges: WorkflowBuilderEdge[] };

export type OpenedSource =
  | { kind: 'local' }
  | { kind: 'workflow'; workflowId: string; name: string; diagram: Diagram }
  | { kind: 'execution'; executionId: string; diagram: Diagram };

const EMPTY_DIAGRAM: Diagram = { nodes: [], edges: [] };

async function read<T>(what: 'run' | 'workflow', path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}${path}`);
  } catch {
    throw new OpenError(what, 'the server did not answer');
  }
  if (!response.ok) throw new OpenError(what, `the server answered ${response.status}`);
  try {
    return (await response.json()) as T;
  } catch {
    throw new OpenError(what, "the server's answer could not be read");
  }
}

// Lowercased: the stream subscribes under the id as written, and the worker notifies lowercase ones.
function idIn(address: URLSearchParams, name: 'executionId' | 'workflowId'): string | undefined {
  const value = address.get(name)?.trim().toLowerCase();
  return value || undefined;
}

/** Runs once, before the editor mounts. A run goes into the store here, and `useBackendExecution` opens its stream. */
export async function openFromUrl(search: string): Promise<OpenedSource> {
  const address = new URLSearchParams(search);
  const executionId = idIn(address, 'executionId');
  const workflowId = idIn(address, 'workflowId');

  if (executionId !== undefined) {
    const path = `/api/executions/${encodeURIComponent(executionId)}/snapshot`;
    const run = await read<GetExecutionSnapshotResponse>('run', path);
    setExecutionStarted(executionId, `/api/executions/${executionId}/stream`);
    return { kind: 'execution', executionId, diagram: run.snapshot as Diagram };
  }

  if (workflowId !== undefined) {
    const workflow = await read<WorkflowRecord>('workflow', `/api/workflows/${encodeURIComponent(workflowId)}`);
    const diagram = (workflow.draftJson ?? workflow.publishedJson ?? EMPTY_DIAGRAM) as Diagram;
    return { kind: 'workflow', workflowId, name: workflow.name, diagram };
  }

  return { kind: 'local' };
}
