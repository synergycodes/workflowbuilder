import { useCallback, useEffect, useRef } from 'react';

import { connectExecutionStream } from '../adapters/execution-stream-adapter';
import { patchDraft } from '../adapters/save-workflow-draft';
import { BACKEND_URL } from '../config';
import { getTurnstileToken } from '../security/turnstile';
import {
  applyStopRequested,
  isRunAlive,
  resetExecution,
  setExecutionStarted,
  useExecutionStore,
} from '../stores/use-execution-store';
import { syncExecutionIdToAddress } from '../utils/open-from-url/address-execution-id';

// A proxy 404 is not JSON, and only the backend's own code means the server forgot the run.
async function isExecutionNotFound(response: Response): Promise<boolean> {
  const body = (await response.json().catch(() => null)) as { code?: string } | null;
  return body?.code === 'execution_not_found';
}

async function workflowToRun(nodes: unknown[], edges: unknown[], targetWorkflowId?: string): Promise<string> {
  const response = await (targetWorkflowId === undefined
    ? fetch(`${BACKEND_URL}/api/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'AI Studio Draft', draftJson: { nodes, edges } }),
      })
    : patchDraft(targetWorkflowId, nodes, edges));

  if (!response.ok) {
    const error = (await response.json()) as { message?: string };
    throw new Error(error.message ?? 'Failed to save workflow');
  }

  const { id } = (await response.json()) as { id: string };
  return id;
}

/** `onForget` runs once the client forgets the run: on Reset, and when Stop learns the server no longer has it. */
export function useBackendExecution(onForget?: () => void) {
  const disconnectRef = useRef<(() => void) | null>(null);
  const isUnmountedRef = useRef(false);
  const status = useExecutionStore((s) => s.status);
  const executionId = useExecutionStore((s) => s.executionId);
  const streamUrl = useExecutionStore((s) => s.streamUrl);

  // Sole opener of the EventSource. A request still in flight at unmount resolves in here afterwards,
  // and nothing would be left to close what it opened.
  const openStream = useCallback((runId: string, runStreamUrl: string) => {
    disconnectRef.current?.();
    disconnectRef.current = isUnmountedRef.current ? null : connectExecutionStream(runId, runStreamUrl);
  }, []);

  useEffect(() => {
    isUnmountedRef.current = false;
    // The run a link opened is in the store before the editor mounts; this is where its stream opens.
    const { executionId: runId, streamUrl: runStreamUrl, status: runStatus } = useExecutionStore.getState();
    if (runId && runStreamUrl && isRunAlive(runStatus)) openStream(runId, runStreamUrl);
    return () => {
      isUnmountedRef.current = true;
      disconnectRef.current?.();
      disconnectRef.current = null;
    };
  }, [openStream]);

  const executeFromCanvas = useCallback(
    async (
      nodes: unknown[],
      edges: unknown[],
      triggerPayload: Record<string, unknown> = {},
      /** Saves the canvas into this workflow's draft instead of creating a workflow per run. */
      targetWorkflowId?: string,
    ) => {
      // Not redundant with openStream's own close: left open, a stale stream could still mutate the
      // store through the two round trips below.
      disconnectRef.current?.();

      const workflowId = await workflowToRun(nodes, edges, targetWorkflowId);

      const turnstileToken = await getTurnstileToken();

      const execResponse = await fetch(`${BACKEND_URL}/api/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(turnstileToken ? { 'cf-turnstile-token': turnstileToken } : {}),
        },
        body: JSON.stringify({ sourceVersion: 'draft', triggerPayload }),
      });

      if (!execResponse.ok) {
        const error = (await execResponse.json()) as { message?: string };
        throw new Error(error.message ?? 'Execute failed');
      }

      const { executionId: execId, streamUrl } = (await execResponse.json()) as {
        executionId: string;
        streamUrl: string;
      };

      setExecutionStarted(execId, streamUrl);
      syncExecutionIdToAddress(execId);
      openStream(execId, streamUrl);

      return execId;
    },
    [openStream],
  );

  const reset = useCallback(() => {
    disconnectRef.current?.();
    disconnectRef.current = null;
    resetExecution();
    syncExecutionIdToAddress(null);
    onForget?.();
  }, [onForget]);

  const cancel = useCallback(async () => {
    if (!executionId) return;
    applyStopRequested();

    let response: Response;
    try {
      response = await fetch(`${BACKEND_URL}/api/executions/${executionId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Stop request failed:', error);
      return;
    }

    // A Reset or a new run while the request was in flight owns the store now.
    if (useExecutionStore.getState().executionId !== executionId) return;

    if (response.ok || response.status === 409) {
      // The run may have ended over the old stream while the request was in flight.
      if (streamUrl && isRunAlive(useExecutionStore.getState().status)) openStream(executionId, streamUrl);
      return;
    }

    if (response.status !== 404 || !(await isExecutionNotFound(response))) return;
    // Reading the body reopened the window the check above closed.
    if (useExecutionStore.getState().executionId === executionId) reset();
  }, [executionId, streamUrl, openStream, reset]);

  return { executeFromCanvas, cancel, reset, status, executionId };
}
